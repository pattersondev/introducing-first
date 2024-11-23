import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import psycopg2
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "mma_stats"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )

def prepare_fighter_features(conn, fighter_id):
    """Get fighter stats and convert to model features"""
    query = """
        SELECT 
            wins, losses, draws, height, weight, reach, stance,
            sig_strikes_landed_per_min, sig_strikes_accuracy, 
            sig_strikes_absorbed_per_min, sig_strikes_def,
            takedown_avg, takedown_accuracy, takedown_defense,
            sub_avg
        FROM fighters 
        WHERE id = %s
    """
    df = pd.read_sql_query(query, conn, params=[fighter_id])
    return df

def get_historical_matchups(conn):
    """Get historical matchup data for training"""
    query = """
        SELECT 
            m.fighter1_id, m.fighter2_id,
            m.winner_id, m.win_method
        FROM matchups m
        WHERE m.winner_id IS NOT NULL
    """
    return pd.read_sql_query(query, conn)
def get_fighter_stats(conn, fighter_id):
    """Get detailed fighter statistics"""
    query = """
        SELECT 
            f.fighter_id,
            f.first_name,
            f.last_name,
            f.height_and_weight,
            f.birthdate,
            f.team,
            f.nickname,
            f.stance,
            f.win_loss_record,
            f.tko_record,
            f.sub_record,
            s.sig_strikes_landed,
            s.sig_strikes_attempted,
            s.takedowns_landed,
            s.takedowns_attempted,
            s.knockdowns,
            s.submissions_attempted,
            s.reversals,
            s.control_time
        FROM fighters f
        LEFT JOIN striking_stats s ON f.fighter_id = s.fighter_id
        WHERE f.fighter_id = %s
    """
    return pd.read_sql_query(query, conn, params=[fighter_id])

def process_fighter_data(stats_df):
    """Process raw fighter stats into model features"""
    features = {}
    
    # Basic stats
    record = stats_df['win_loss_record'].iloc[0].split('-')
    features['wins'] = int(record[0])
    features['losses'] = int(record[1])
    features['draws'] = int(record[2]) if len(record) > 2 else 0
    
    # Height and weight
    hw = stats_df['height_and_weight'].iloc[0].split()
    features['height'] = float(hw[0].replace("'","."))
    features['weight'] = float(hw[-2])
    
    # Fighting stats
    features['sig_strikes_accuracy'] = stats_df['sig_strikes_landed'].iloc[0] / stats_df['sig_strikes_attempted'].iloc[0] if stats_df['sig_strikes_attempted'].iloc[0] > 0 else 0
    features['takedown_accuracy'] = stats_df['takedowns_landed'].iloc[0] / stats_df['takedowns_attempted'].iloc[0] if stats_df['takedowns_attempted'].iloc[0] > 0 else 0
    features['knockdown_rate'] = stats_df['knockdowns'].iloc[0] / stats_df['sig_strikes_landed'].iloc[0] if stats_df['sig_strikes_landed'].iloc[0] > 0 else 0
    features['submission_rate'] = stats_df['submissions_attempted'].iloc[0] / stats_df['control_time'].iloc[0] if stats_df['control_time'].iloc[0] > 0 else 0
    
    return pd.DataFrame([features])

def prepare_matchup_features(conn, fighter1_id, fighter2_id):
    """Prepare features for a matchup between two fighters"""
    # Get stats for both fighters
    f1_stats = get_fighter_stats(conn, fighter1_id)
    f2_stats = get_fighter_stats(conn, fighter2_id)
    
    # Process stats into features
    f1_features = process_fighter_data(f1_stats)
    f2_features = process_fighter_data(f2_stats)
    
    # Combine features
    matchup_features = pd.concat([f1_features, f2_features], axis=1)
    matchup_features.columns = [f'f1_{c}' for c in f1_features.columns] + [f'f2_{c}' for c in f2_features.columns]
    
    return matchup_features


def train_models():
    """Train winner and method prediction models"""
    conn = get_db_connection()
    
    # Get historical matchup data
    matchups = get_historical_matchups(conn)
    
    # Prepare features for each fighter in matchups
    features = []
    for _, row in matchups.iterrows():
        f1_features = prepare_fighter_features(conn, row['fighter1_id'])
        f2_features = prepare_fighter_features(conn, row['fighter2_id'])
        
        # Combine features
        matchup_features = pd.concat([f1_features, f2_features], axis=1)
        features.append(matchup_features)
    
    X = pd.concat(features, axis=0)
    
    # Prepare labels
    y_winner = (matchups['winner_id'] == matchups['fighter1_id']).astype(int)
    y_method = matchups['win_method']
    
    # Train winner prediction model
    X_train, X_test, y_train, y_test = train_test_split(X, y_winner, test_size=0.2)
    winner_model = RandomForestClassifier(n_estimators=100)
    winner_model.fit(X_train, y_train)
    
    # Train method prediction model
    method_model = RandomForestClassifier(n_estimators=100)
    method_model.fit(X_train, y_method)
    
    return winner_model, method_model

@app.route('/predict', methods=['POST'])
def predict_matchup():
    data = request.get_json()
    fighter1_id = data.get('fighter1_id')
    fighter2_id = data.get('fighter2_id')
    
    if not fighter1_id or not fighter2_id:
        return jsonify({'error': 'Missing fighter IDs'}), 400
    
    conn = get_db_connection()
    
    # Get fighter features
    f1_features = prepare_fighter_features(conn, fighter1_id)
    f2_features = prepare_fighter_features(conn, fighter2_id)
    
    # Combine features
    matchup_features = pd.concat([f1_features, f2_features], axis=1)
    
    # Make predictions
    winner_model, method_model = train_models()
    
    win_prob = winner_model.predict_proba(matchup_features)[0]
    method_probs = method_model.predict_proba(matchup_features)[0]
    
    return jsonify({
        'fighter1_win_probability': float(win_prob[1]),
        'fighter2_win_probability': float(win_prob[0]),
        'win_method_probabilities': {
            'KO/TKO': float(method_probs[0]),
            'Submission': float(method_probs[1]), 
            'Decision': float(method_probs[2])
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
