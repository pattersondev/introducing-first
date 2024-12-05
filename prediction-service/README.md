# UFC Fight Predictor

## Prediction Model

### Data Points Considered

The model analyzes the following factors to make fight predictions:

#### Basic Stats (30%)
- Win-loss record
- Finish rate (KO/TKO and submissions)

#### Recent Form (20%)
- Last 3 fights (W/L/N)
- More recent fights weighted more heavily

#### Striking Effectiveness (20%)
- Strike accuracy
- Significant strike accuracy
- Knockdown average
- Head/body strike percentages

#### Grappling Effectiveness (20%)
- Takedown accuracy
- Submission attempts
- Ground control

#### Style Matchup (10%)
- Stance advantages (Orthodox/Southpaw/Switch)
- Striker vs Grappler dynamics

### Prediction Output
The model returns:
- Predicted winner
- Win probability
- Most likely method of victory
- Underdog details
- Weight class

### Data Sources
- Fighter biographical data
- Historical fight results
- Strike statistics
- Grappling statistics
- Fighter attributes