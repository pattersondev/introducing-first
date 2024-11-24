from sqlalchemy import create_engine
import pandas as pd
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

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
            fighter_id,
            height,
            weight,
            age,
            reach,
            win_loss_record,
            tko_record,
            sub_record,
            first_name,
            last_name,
            nickname,
            stance,
            weight_class
        FROM fighters
        WHERE fighter_id = %s
    """
    return pd.read_sql_query(query, engine, params=(fighter_id,))

def calculate_win_probability(f1_stats, f2_stats):
    """Calculate win probability based on fighter stats comparison"""
    
    # Parse win-loss records
    def parse_record(record):
        if not record:
            return 0, 0, 0
        parts = record.split('-')
        return int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0
    
    # Parse records
    f1_wins, f1_losses, f1_draws = parse_record(f1_stats['win_loss_record'])
    f2_wins, f2_losses, f2_draws = parse_record(f2_stats['win_loss_record'])
    
    # Calculate win rates
    f1_win_rate = f1_wins / (f1_wins + f1_losses) if (f1_wins + f1_losses) > 0 else 0
    f2_win_rate = f2_wins / (f2_wins + f2_losses) if (f2_wins + f2_losses) > 0 else 0
    
    # Parse finish rates
    def parse_finish_record(record):
        if not record:
            return 0, 0
        wins, losses = record.split('-')
        return int(wins), int(losses)
    
    f1_ko_wins, _ = parse_finish_record(f1_stats['tko_record'])
    f1_sub_wins, _ = parse_finish_record(f1_stats['sub_record'])
    f2_ko_wins, _ = parse_finish_record(f2_stats['tko_record'])
    f2_sub_wins, _ = parse_finish_record(f2_stats['sub_record'])
    
    # Calculate finish rates
    f1_finish_rate = (f1_ko_wins + f1_sub_wins) / f1_wins if f1_wins > 0 else 0
    f2_finish_rate = (f2_ko_wins + f2_sub_wins) / f2_wins if f2_wins > 0 else 0
    
    # Calculate physical advantages
    height_advantage = (float(f1_stats['height']) - float(f2_stats['height'])) / 10
    reach_advantage = (float(f1_stats['reach'].replace('"', '')) - float(f2_stats['reach'].replace('"', ''))) / 10
    age_advantage = (float(f2_stats['age']) - float(f1_stats['age'])) / 10  # younger fighter advantage
    
    # Combine factors
    f1_score = (
        f1_win_rate * 0.4 +
        f1_finish_rate * 0.3 +
        height_advantage * 0.1 +
        reach_advantage * 0.1 +
        age_advantage * 0.1
    )
    
    f2_score = (
        f2_win_rate * 0.4 +
        f2_finish_rate * 0.3 +
        -height_advantage * 0.1 +
        -reach_advantage * 0.1 +
        -age_advantage * 0.1
    )
    
    # Convert to probability
    total = f1_score + f2_score
    if total == 0:
        return 0.5
    
    # Normalize to 0.3-0.7 range to avoid extreme predictions
    raw_prob = f1_score / total if total > 0 else 0.5
    normalized_prob = 0.3 + (raw_prob * 0.4)
    
    return normalized_prob

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
        
        # Calculate win probability
        f1_win_prob = calculate_win_probability(f1_stats, f2_stats)
        
        # Format fighter names with nickname if available
        def format_fighter_name(stats):
            if stats.get('nickname'):
                return f"{stats['first_name']} '{stats['nickname']}' {stats['last_name']}"
            return f"{stats['first_name']} {stats['last_name']}"
        
        f1_name = format_fighter_name(f1_stats)
        f2_name = format_fighter_name(f2_stats)
        
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
                'win_probability': round((1 - f1_win_prob) * 100, 1)
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
                'win_probability': round(f1_win_prob * 100, 1)
            }
        
        return jsonify({
            'prediction': {
                'winner': winner,
                'underdog': underdog,
                'weight_class': f1_stats['weight_class']
            }
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
