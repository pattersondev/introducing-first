import pandas as pd
from sqlalchemy import create_engine
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib
import os
from tqdm import tqdm

def get_db_connection():
    return create_engine(
        f'postgresql+pg8000://{os.getenv("DB_USER", "postgres")}:'
        f'{os.getenv("DB_PASSWORD", "jackcameron")}@'
        f'{os.getenv("DB_HOST", "localhost")}/'
        f'{os.getenv("DB_NAME", "local_copy")}'
    )

def get_fighter_stats_before_date(engine, fighter_id, date):
    """Get fighter's stats as they were before a specific date"""
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
            -- Calculate win-loss record up to the fight date
            (
                SELECT COUNT(*)
                FROM matchups m2
                JOIN events e2 ON m2.event_id = e2.event_id
                WHERE ((m2.fighter1_id = f.fighter_id AND m2.winner = m2.fighter1_name)
                   OR (m2.fighter2_id = f.fighter_id AND m2.winner = m2.fighter2_name))
                AND e2.date < %s
            ) || '-' || 
            (
                SELECT COUNT(*)
                FROM matchups m2
                JOIN events e2 ON m2.event_id = e2.event_id
                WHERE ((m2.fighter1_id = f.fighter_id AND m2.winner != m2.fighter1_name)
                   OR (m2.fighter2_id = f.fighter_id AND m2.winner != m2.fighter2_name))
                AND m2.winner IS NOT NULL
                AND e2.date < %s
            ) || '-0' as win_loss_record,
            -- Calculate TKO record
            (
                SELECT COUNT(*)
                FROM matchups m2
                JOIN events e2 ON m2.event_id = e2.event_id
                WHERE ((m2.fighter1_id = f.fighter_id AND m2.winner = m2.fighter1_name)
                   OR (m2.fighter2_id = f.fighter_id AND m2.winner = m2.fighter2_name))
                AND m2.result LIKE '%%KO%%'
                AND e2.date < %s
            ) || '-0' as tko_record,
            -- Calculate submission record
            (
                SELECT COUNT(*)
                FROM matchups m2
                JOIN events e2 ON m2.event_id = e2.event_id
                WHERE ((m2.fighter1_id = f.fighter_id AND m2.winner = m2.fighter1_name)
                   OR (m2.fighter2_id = f.fighter_id AND m2.winner = m2.fighter2_name))
                AND m2.result LIKE '%%Submission%%'
                AND e2.date < %s
            ) || '-0' as sub_record,
            f.weight_class,
            -- Striking stats aggregates up to the fight date
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
            COALESCE(fa.chin_rating, 0) as chin
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
    
    result = pd.read_sql_query(
        query, 
        engine, 
        params=(date, date, date, date, fighter_id)
    )
    
    if result.empty:
        return None
    return result.iloc[0].to_dict()

def prepare_training_data():
    """Get historical matchups and their outcomes"""
    engine = get_db_connection()
    
    print("Fetching historical matchups from database...")
    query = """
        SELECT 
            m.matchup_id,
            m.fighter1_id,
            m.fighter2_id,
            m.winner,
            m.result,
            e.date,
            f1.first_name as fighter1_first_name,
            f1.last_name as fighter1_last_name,
            f2.first_name as fighter2_first_name,
            f2.last_name as fighter2_last_name
        FROM matchups m
        JOIN events e ON m.event_id = e.event_id
        JOIN fighters f1 ON m.fighter1_id = f1.fighter_id
        JOIN fighters f2 ON m.fighter2_id = f2.fighter_id
        WHERE m.result IS NOT NULL
        ORDER BY e.date DESC
    """
    
    matchups = pd.read_sql_query(query, engine)
    print(f"Found {len(matchups)} historical matchups")
    
    # Create empty lists to store our features and targets
    X = []  # Features
    y = []  # Targets (1 if fighter1 won, 0 if fighter2 won)
    
    print("Processing fights and creating feature vectors...")
    for _, matchup in tqdm(matchups.iterrows(), total=len(matchups), desc="Processing fights"):
        # Get both fighters' stats before this fight
        f1_stats = get_fighter_stats_before_date(engine, matchup['fighter1_id'], matchup['date'])
        f2_stats = get_fighter_stats_before_date(engine, matchup['fighter2_id'], matchup['date'])
        
        if f1_stats is None or f2_stats is None:
            continue
            
        # Create feature vector for this matchup
        features = create_feature_vector(f1_stats, f2_stats)
        X.append(features)
        
        # Create fighter full names
        fighter1_name = f"{matchup['fighter1_first_name']} {matchup['fighter1_last_name']}"
        fighter2_name = f"{matchup['fighter2_first_name']} {matchup['fighter2_last_name']}"
        
        # Create target (1 if fighter1 won, 0 if fighter2 won)
        winner = 1 if matchup['winner'] == fighter1_name else 0
        y.append(winner)
    
    print(f"Successfully processed {len(X)} fights")
    return np.array(X), np.array(y)

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

def train_model():
    print("\n=== Starting Model Training ===")
    print("Step 1: Preparing training data...")
    X, y = prepare_training_data()
    
    print("\nStep 2: Splitting into training and testing sets...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    print(f"Training set size: {len(X_train)} fights")
    print(f"Testing set size: {len(X_test)} fights")
    
    print("\nStep 3: Training Random Forest model...")
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    
    # Evaluate model
    print("\nStep 4: Evaluating model performance...")
    train_accuracy = model.score(X_train, y_train)
    test_accuracy = model.score(X_test, y_test)
    
    print("\n=== Training Results ===")
    print(f"Training accuracy: {train_accuracy:.2f}")
    print(f"Testing accuracy: {test_accuracy:.2f}")
    
    print("\nStep 5: Saving trained model...")
    joblib.dump(model, 'trained_model.joblib')
    print("Model saved as 'trained_model.joblib'")
    
    return model

if __name__ == "__main__":
    model = train_model() 