package db

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var db *sql.DB

func StartDbConnection() *sql.DB {
	connStr := os.Getenv("CONNECTION_STRING")

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}

	return db
}

// func InsertFighter(fighter models.Fighter) error {
// 	//func to insert fighter into database. (used to create a new fighter in the DB)
// 	sqlStatement := "INSERT INTO public.fighter(first_name, last_name, weight, height, birthdate, age, team, nickname, stance, win_loss_record, tko_record, sub_record) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING fighter_id;"

// 	var fighterID int

// 	//*** height and weight calculation ***
// 	var heightAndWeight = strings.Split(fighter.HeightAndWeight, ",")

// 	var fheight = heightAndWeight[0]
// 	var fweight = heightAndWeight[1]

// 	//extracting just the integer, removing the "LBS" after
// 	fweight = strings.Split(fweight, " ")[0]

// 	//split the height into feet and inches
// 	parts := strings.Split(fheight, "'")

// 	//trim spaces
// 	feet := strings.TrimSpace(parts[0])
// 	inches := strings.TrimSpace(parts[1])

// 	//format as "feet.inches" with leading zeros. Ex: "5' 11" will be stored in the database as a double of "5.11"
// 	decimalHeight := fmt.Sprintf("%s.%02s", feet, inches)

// 	//*** age and birthday calculation ***
// 	var birthdateAndAge = fighter.Birthdate

// 	//spliting the string by the space to separate date and age
// 	bDayParts := strings.Split(birthdateAndAge, " (")
// 	dateStr := strings.TrimSpace(bDayParts[0])
// 	ageStr := strings.TrimSuffix(bDayParts[1], ")")

// 	//converting age to int
// 	age := 0
// 	fmt.Sscanf(ageStr, "%d", &age)

// 	//converting date string to time.Time
// 	//using a dummy date so the formatter knows expected date format
// 	date, _ := time.Parse("1/2/2006", dateStr)

// 	err := db.QueryRowContext(context.Background(), sqlStatement,
// 		fighter.FirstName, fighter.LastName, fweight, decimalHeight,
// 		date.Format("2006-01-02"), age, fighter.Team, fighter.Nickname,
// 		fighter.Stance, fighter.WinLossRecord, fighter.TKORecord, fighter.SubRecord).Scan(&fighterID)

// 	if err != nil {
// 		return fmt.Errorf("unable to insert fighter: %w", err)
// 	}
// 	// Insert StrikingStats
// 	if err := InsertStrikingStats(fighterID, fighter.StrikingStats); err != nil {
// 		return 0, err
// 	}

// 	// Insert ClinchStats
// 	if err := InsertClinchStats(fighterID, fighter.ClinchStats); err != nil {
// 		return 0, err
// 	}

// 	// Insert GroundStats
// 	if err := InsertGroundStats(fighterID, fighter.GroundStats); err != nil {
// 		return 0, err
// 	}

// 	return fighterID, nil
// }

// func InsertStrikingStats(fighterID int, stats []models.StrikingStats) error {
// 	for _, stat := range stats {
// 		sqlStatement := "INSERT INTO striking_stats(fighter_id, total_strikes, significant_strikes, strikes_accuracy) VALUES ($1, $2, $3, $4);"
// 		_, err := db.ExecContext(context.Background(), sqlStatement, fighterID, stat.TotalStrikes, stat.SignificantStrikes, stat.StrikesAccuracy)
// 		if err != nil {
// 			return fmt.Errorf("unable to insert striking stats for fighter %d: %w", fighterID, err)
// 		}
// 	}
// 	return nil
// }

// func BulkInsertFighters(fighters []models.Fighter) error {
// 	//func to insert multiple fighters

// 	//if fighters array is empty, don't do anything
// 	if len(fighters) == 0 {
// 		return nil
// 	}

// 	//calling the existing InsertFighter function for each fighter in the fighter array
// 	for _, fighter := range fighters {
// 		if err := InsertFighter(fighter); err != nil {
// 			return err
// 		}
// 	}

// 	return nil
// }

// func SelectFighter(fId int) (models.Fighter, error) {
// 	//func to select a fighter from the database, based on the fighter's fighter_id (Primary Key)
// 	//returns a fighter object created using data retrieved from DB (or an error)

// 	var fighter models.Fighter

// 	sqlStatement := "SELECT name, nickname, division_title, status, hometown, octagon_debut, image_link, girth, stance, fighter_id, fighting_style, gym, age, height, weight, reach, leg_reach FROM public.fighter WHERE fighter_id = $1;"

// 	row := db.QueryRowContext(context.Background(), sqlStatement, fId)

// 	err := row.Scan(&fighter.Name, &fighter.Nickname, &fighter.DivisionTitle, &fighter.Status,
// 		&fighter.Hometown, &fighter.OctagonDebut, &fighter.ImageLink, &fighter.Girth,
// 		&fighter.Stance, &fighter.FighterID, &fighter.FightingStyle, &fighter.Gym,
// 		&fighter.Age, &fighter.Height, &fighter.Weight, &fighter.Reach, &fighter.LegReach)

// 	if err != nil {
// 		if err == sql.ErrNoRows {
// 			//error message if no fighter is found for provided fighter id
// 			return fighter, fmt.Errorf("No Fighter found with given fighter id of: ", fId)
// 		}
// 		//other message for other problems
// 		return fighter, fmt.Errorf("Error when selecting fighter: ", err)
// 	}

// 	return fighter, nil

// }

// func DeleteFighter(fId int) error(){

// 	sqlStatement :=
// }
