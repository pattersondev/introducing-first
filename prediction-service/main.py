from sqlalchemy import create_engine
import pandas as pd
from flask import Flask, request, jsonify
import os
from sklearn.ensemble import RandomForestClassifier
import joblib

app = Flask(__name__)

# Load trained model
try:
    model = joblib.load('trained_model.joblib')
except:
    print("Warning: No trained model found. Please run train_model.py first")
    model = None

def get_db_connection():
    return create_engine(
        f'postgresql+pg8000://{os.getenv("DB_USER", "postgres")}:'
        f'{os.getenv("DB_PASSWORD", "jackcameron")}@'
        f'{os.getenv("DB_HOST", "localhost")}/'
        f'{os.getenv("DB_NAME", "local_copy")}'
    )

def get_fighter_stats(engine, fighter_id):
    query = """
        SELECT 
            f.fighter_id,
            f.first_name,
            f.last_name,
            f.height,
            f.weight,
            f.age,
            f.reach,
            f.nickname,
            f.stance,
            f.win_loss_record,
            f.tko_record,
            f.sub_record,
            f.weight_class,
            -- Striking stats aggregates
            AVG(COALESCE(s.tsl, 0)) as avg_strikes_landed,
            AVG(COALESCE(s.tsa, 0)) as avg_strikes_attempted,
            AVG(COALESCE(s.ssl, 0)) as avg_sig_strikes_landed,
            AVG(COALESCE(s.ssa, 0)) as avg_sig_strikes_attempted,
            AVG(COALESCE(s.kd, 0)) as avg_knockdowns,
            AVG(COALESCE(s.head_perc, 0)) as head_strike_pct,
            AVG(COALESCE(s.body_perc, 0)) as body_strike_pct,
            -- Clinch stats aggregates
            AVG(COALESCE(c.tdl, 0)) as avg_takedowns_landed,
            AVG(COALESCE(c.tda, 0)) as avg_takedowns_attempted,
            AVG(COALESCE(c.tk_acc_perc, 0)) as takedown_accuracy,
            -- Ground stats aggregates
            AVG(COALESCE(g.sm, 0)) as avg_submission_attempts,
            -- Fighter attributes
            COALESCE(fa.striking_offense_rating, 0) as striking_offense,
            COALESCE(fa.striking_defense_rating, 0) as striking_defense,
            COALESCE(fa.takedown_offense_rating, 0) as takedown_offense,
            COALESCE(fa.takedown_defense_rating, 0) as takedown_defense,
            COALESCE(fa.submission_offense_rating, 0) as submission_offense,
            COALESCE(fa.submission_defense_rating, 0) as submission_defense,
            COALESCE(fa.cardio_rating, 0) as cardio,
            COALESCE(fa.chin_rating, 0) as chin,
            -- Recent form (last 3 fights)
            (
                SELECT string_agg(
                    CASE 
                        WHEN (m.fighter1_id = f.fighter_id AND m.winner = m.fighter1_name) 
                        OR (m.fighter2_id = f.fighter_id AND m.winner = m.fighter2_name)
                        THEN 'W'
                        WHEN m.winner IS NULL THEN 'N'
                        ELSE 'L'
                    END,
                    ''
                    ORDER BY e.date DESC
                )
                FROM matchups m
                JOIN events e ON m.event_id = e.event_id
                WHERE (m.fighter1_id = f.fighter_id OR m.fighter2_id = f.fighter_id)
                AND m.result IS NOT NULL
                LIMIT 3
            ) as recent_form
        FROM fighters f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id
        LEFT JOIN clinch_stats c ON f.fighter_id = c.fighter_id
        LEFT JOIN ground_stats g ON f.fighter_id = g.fighter_id
        LEFT JOIN fighter_attributes fa ON f.fighter_id = fa.fighter_id
        WHERE f.fighter_id = %s
        GROUP BY 
            f.fighter_id, 
            f.first_name,
            f.last_name,
            f.height,
            f.weight,
            f.age,
            f.reach,
            f.nickname,
            f.stance,
            f.win_loss_record,
            f.tko_record,
            f.sub_record,
            f.weight_class,
            fa.striking_offense_rating,
            fa.striking_defense_rating,
            fa.takedown_offense_rating,
            fa.takedown_defense_rating,
            fa.submission_offense_rating,
            fa.submission_defense_rating,
            fa.cardio_rating,
            fa.chin_rating
    """
    return pd.read_sql_query(query, engine, params=(fighter_id,))

def calculate_win_probability(f1_stats, f2_stats):
    """Enhanced prediction model including style, recent form, and detailed stats"""
    
    # === Basic Stats (30%) ===
    # Win rate and finish rate (as before)
    f1_basic = calculate_basic_stats(f1_stats)
    f2_basic = calculate_basic_stats(f2_stats)
    
    # === Recent Form (20%) ===
    f1_form = calculate_form_score(f1_stats.get('recent_form', ''))
    f2_form = calculate_form_score(f2_stats.get('recent_form', ''))
    
    # === Striking Effectiveness (20%) ===
    f1_striking = calculate_striking_score(f1_stats)
    f2_striking = calculate_striking_score(f2_stats)
    
    # === Grappling Effectiveness (20%) ===
    f1_grappling = calculate_grappling_score(f1_stats)
    f2_grappling = calculate_grappling_score(f2_stats)
    
    # === Style Matchup (10%) ===
    style_advantage = calculate_style_matchup(f1_stats, f2_stats)
    
    # Combine all factors
    f1_score = (
        f1_basic * 0.3 +
        f1_form * 0.2 +
        f1_striking * 0.2 +
        f1_grappling * 0.2 +
        style_advantage * 0.1
    )
    
    f2_score = (
        f2_basic * 0.3 +
        f2_form * 0.2 +
        f2_striking * 0.2 +
        f2_grappling * 0.2 +
        -style_advantage * 0.1
    )
    
    # Normalize to probability
    total = f1_score + f2_score
    if total == 0:
        return 0.5
    
    raw_prob = f1_score / total
    # Constrain to 0.25-0.75 range to avoid extreme predictions
    return 0.25 + (raw_prob * 0.5)

def parse_record(record):
    """Parse a win-loss-draw record string into numbers"""
    if not record:
        return 0, 0, 0
    parts = record.split('-')
    return (
        int(parts[0]),  # wins
        int(parts[1]),  # losses
        int(parts[2]) if len(parts) > 2 else 0  # draws
    )

def parse_finish_record(record):
    """Parse a finish record string (e.g., "7-0" for 7 KO wins, 0 KO losses)"""
    if not record:
        return 0, 0
    wins, losses = record.split('-')
    return int(wins), int(losses)

def calculate_basic_stats(stats):
    """Calculate basic stats score"""
    wins, losses, draws = parse_record(stats['win_loss_record'])
    win_rate = wins / (wins + losses) if (wins + losses) > 0 else 0
    
    ko_wins, _ = parse_finish_record(stats['tko_record'])
    sub_wins, _ = parse_finish_record(stats['sub_record'])
    finish_rate = (ko_wins + sub_wins) / wins if wins > 0 else 0
    
    return (win_rate * 0.6 + finish_rate * 0.4)

def calculate_form_score(recent_form):
    """Calculate score based on recent form"""
    if not recent_form:
        return 0.5
    
    scores = {'W': 1, 'L': 0, 'N': 0.5}
    total = 0
    weight = 1.0
    
    for result in recent_form:
        total += scores.get(result, 0.5) * weight
        weight *= 0.7  # More recent fights count more
        
    return total / (1 + 0.7 + 0.49)  # Normalize by weight sum

def calculate_striking_score(stats):
    """Calculate striking effectiveness score"""
    strikes_landed = float(stats.get('strikes_landed', 0))
    strikes_attempted = float(stats.get('strikes_attempted', 0))
    sig_strikes_landed = float(stats.get('sig_strikes_landed', 0))
    sig_strikes_attempted = float(stats.get('sig_strikes_attempted', 0))
    knockdowns = float(stats.get('knockdowns', 0))
    
    accuracy = strikes_landed / strikes_attempted if strikes_attempted > 0 else 0
    sig_accuracy = sig_strikes_landed / sig_strikes_attempted if sig_strikes_attempted > 0 else 0
    
    return (accuracy * 0.3 + sig_accuracy * 0.4 + (knockdowns/10) * 0.3)

def calculate_grappling_score(stats):
    """Calculate grappling effectiveness score"""
    takedowns_landed = float(stats.get('takedowns_landed', 0))
    takedowns_attempted = float(stats.get('takedowns_attempted', 0))
    submission_attempts = float(stats.get('submission_attempts', 0))
    top_positions = float(stats.get('top_positions', 0))
    
    td_accuracy = takedowns_landed / takedowns_attempted if takedowns_attempted > 0 else 0
    
    return (td_accuracy * 0.4 + (submission_attempts/10) * 0.3 + (top_positions/10) * 0.3)

def calculate_style_matchup(f1_stats, f2_stats):
    """Calculate style matchup advantage"""
    # Define style matchup matrix
    style_advantages = {
        'Orthodox': {'Orthodox': 0, 'Southpaw': -0.1, 'Switch': 0.1},
        'Southpaw': {'Orthodox': 0.1, 'Southpaw': 0, 'Switch': -0.1},
        'Switch': {'Orthodox': -0.1, 'Southpaw': 0.1, 'Switch': 0}
    }
    
    f1_stance = f1_stats.get('stance', 'Orthodox')
    f2_stance = f2_stats.get('stance', 'Orthodox')
    
    stance_advantage = style_advantages.get(f1_stance, {}).get(f2_stance, 0)
    
    # Add grappler vs striker dynamics
    f1_grappling_bias = calculate_grappling_score(f1_stats) - calculate_striking_score(f1_stats)
    f2_grappling_bias = calculate_grappling_score(f2_stats) - calculate_striking_score(f2_stats)
    
    style_clash = (f1_grappling_bias - f2_grappling_bias) * 0.2
    
    return stance_advantage + style_clash

def predict_victory_method(winner_stats):
    """Predict most likely method of victory based on fighter's stats"""
    
    # Parse finish records
    ko_wins, _ = winner_stats['tko_record'].split('-')
    sub_wins, _ = winner_stats['sub_record'].split('-')
    wins, losses, _ = winner_stats['win_loss_record'].split('-')
    
    ko_wins = int(ko_wins)
    sub_wins = int(sub_wins)
    total_wins = int(wins)
    
    # Calculate decision wins
    dec_wins = total_wins - (ko_wins + sub_wins)
    
    # Calculate percentages
    total = total_wins
    if total == 0:
        return "Decision"  # Default to decision if no wins
        
    ko_rate = ko_wins / total
    sub_rate = sub_wins / total
    dec_rate = dec_wins / total
    
    # Return highest percentage method
    methods = {
        'KO/TKO': ko_rate,
        'Submission': sub_rate,
        'Decision': dec_rate
    }
    
    return max(methods.items(), key=lambda x: x[1])[0]

def clean_measurement(value):
    """Clean measurement values by removing units and converting to float"""
    if isinstance(value, (int, float)):
        return float(value)
    if not value or value == 'None':
        return 0.0
    # Remove units and convert to float
    try:
        return float(value.replace('"', '').replace("'", ''))
    except:
        return 0.0

def create_feature_vector(f1_stats, f2_stats):
    """Convert two fighters' stats into a single feature vector"""
    features = []
    
    # Basic stats differences
    features.extend([
        float(f1_stats['age'] or 0) - float(f2_stats['age'] or 0),
        clean_measurement(f1_stats['height']) - clean_measurement(f2_stats['height']),
        clean_measurement(f1_stats['reach']) - clean_measurement(f2_stats['reach'])
    ])
    
    # Striking stats differences
    features.extend([
        float(f1_stats['avg_strikes_landed'] or 0) - float(f2_stats['avg_strikes_landed'] or 0),
        float(f1_stats['head_strike_pct'] or 0) - float(f2_stats['head_strike_pct'] or 0),
        float(f1_stats['avg_knockdowns'] or 0) - float(f2_stats['avg_knockdowns'] or 0)
    ])
    
    # Grappling stats differences
    features.extend([
        float(f1_stats['takedown_accuracy'] or 0) - float(f2_stats['takedown_accuracy'] or 0),
        float(f1_stats['avg_submission_attempts'] or 0) - float(f2_stats['avg_submission_attempts'] or 0)
    ])
    
    # Fighter attributes differences
    features.extend([
        float(f1_stats['striking_offense'] or 0) - float(f2_stats['striking_offense'] or 0),
        float(f1_stats['striking_defense'] or 0) - float(f2_stats['striking_defense'] or 0),
        float(f1_stats['takedown_offense'] or 0) - float(f2_stats['takedown_offense'] or 0),
        float(f1_stats['takedown_defense'] or 0) - float(f2_stats['takedown_defense'] or 0),
        float(f1_stats['cardio'] or 0) - float(f2_stats['cardio'] or 0),
        float(f1_stats['chin'] or 0) - float(f2_stats['chin'] or 0)
    ])
    
    return features

def predict_fight_details(f1_stats, f2_stats):
    """Predict round and time details of the fight"""
    
    # Parse records for finish rates
    f1_wins, f1_losses, _ = parse_record(f1_stats['win_loss_record'])
    f2_wins, f2_losses, _ = parse_record(f2_stats['win_loss_record'])
    
    # Calculate average fight duration for both fighters
    f1_finish_rate = (float(f1_stats.get('avg_knockdowns', 0)) + 
                     float(f1_stats.get('avg_submission_attempts', 0))) / max(f1_wins, 1)
    f2_finish_rate = (float(f2_stats.get('avg_knockdowns', 0)) + 
                     float(f2_stats.get('avg_submission_attempts', 0))) / max(f2_wins, 1)
    
    # Predict round probabilities
    round_probs = {
        "round_1": 0.4 * (f1_finish_rate + f2_finish_rate),
        "round_2": 0.3 * (f1_finish_rate + f2_finish_rate),
        "round_3": 0.2 * (f1_finish_rate + f2_finish_rate),
        "distance": 1.0 - (0.9 * (f1_finish_rate + f2_finish_rate))
    }
    
    # Normalize probabilities
    total = sum(round_probs.values())
    round_probs = {k: round(v/total * 100, 1) for k, v in round_probs.items()}
    
    # Predict most likely time window
    early_round_prob = 0.6
    mid_round_prob = 0.3
    late_round_prob = 0.1
    
    time_probs = {
        "early": round(early_round_prob * 100, 1),
        "middle": round(mid_round_prob * 100, 1),
        "late": round(late_round_prob * 100, 1)
    }
    
    return {
        "round_probabilities": round_probs,
        "time_probabilities": time_probs,
        "likely_duration": "Quick" if f1_finish_rate + f2_finish_rate > 1.5 else "Normal" if f1_finish_rate + f2_finish_rate > 0.8 else "Long"
    }

@app.route('/predict', methods=['POST'])
def predict_matchup():
    try:
        data = request.get_json()
        fighter1_id = data.get('fighter1_id')
        fighter2_id = data.get('fighter2_id')
        
        if not fighter1_id or not fighter2_id:
            return jsonify({'error': 'Missing fighter IDs'}), 400
            
        engine = get_db_connection()
        
        # Get fighter stats
        f1_features = get_fighter_stats(engine, fighter1_id)
        f2_features = get_fighter_stats(engine, fighter2_id)
        
        if f1_features.empty or f2_features.empty:
            return jsonify({'error': 'One or both fighters not found'}), 404
            
        f1_stats = f1_features.to_dict('records')[0]
        f2_stats = f2_features.to_dict('records')[0]
        
        # Format fighter names
        def format_fighter_name(stats):
            if stats.get('nickname'):
                return f"{stats['first_name']} '{stats['nickname']}' {stats['last_name']}"
            return f"{stats['first_name']} {stats['last_name']}"
        
        f1_name = format_fighter_name(f1_stats)
        f2_name = format_fighter_name(f2_stats)
        
        # Get prediction from trained model if available, otherwise use rule-based
        if model is not None:
            features = create_feature_vector(f1_stats, f2_stats)
            f1_win_prob = model.predict_proba([features])[0][1]
        else:
            f1_win_prob = calculate_win_probability(f1_stats, f2_stats)
        
        # Determine winner and method
        if f1_win_prob > 0.5:
            winner = {
                'fighter_id': fighter1_id,
                'name': f1_name,
                'win_probability': round(f1_win_prob * 100, 1),
                'method': predict_victory_method(f1_stats)
            }
            underdog = {
                'fighter_id': fighter2_id,
                'name': f2_name,
                'win_probability': round((1 - f1_win_prob) * 100, 1),
                'method': predict_victory_method(f2_stats)
            }
        else:
            winner = {
                'fighter_id': fighter2_id,
                'name': f2_name,
                'win_probability': round((1 - f1_win_prob) * 100, 1),
                'method': predict_victory_method(f2_stats)
            }
            underdog = {
                'fighter_id': fighter1_id,
                'name': f1_name,
                'win_probability': round(f1_win_prob * 100, 1),
                'method': predict_victory_method(f1_stats)
            }
        
        # Add matchup details
        matchup_details = predict_fight_details(f1_stats, f2_stats)
        
        return jsonify({
            'prediction': {
                'winner': winner,
                'underdog': underdog,
                'weight_class': f1_stats['weight_class'],
                'model_type': 'machine_learning' if model else 'rule_based',
                'matchup_details': matchup_details
            }
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
