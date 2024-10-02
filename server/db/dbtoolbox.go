package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"server/models"

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

func InsertFighter(fighter models.Fighter) error {
	//func to insert fighter into database. (used to create a new fighter in the DB)
	sqlStatement := "INSERT INTO public.fighter(name, nickname, division_title, status, hometown, octagon_debut, image_link, girth, stance, fighter_id, fighting_style, gym, age, height, weight, reach, leg_reach) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);"

	_, err := db.ExecContext(context.Background(), sqlStatement,
		fighter.Name, fighter.Nickname, fighter.DivisionTitle, fighter.Status,
		fighter.Hometown, fighter.OctagonDebut, fighter.ImageLink, fighter.Girth, fighter.Stance,
		fighter.FighterID, fighter.FightingStyle, fighter.Gym, fighter.Age, fighter.Height,
		fighter.Weight, fighter.Reach, fighter.LegReach)

	if err != nil {
		return fmt.Errorf("unable to insert fighter: %w", err)
	}
	return nil
}

func BulkInsertFighters(fighters []models.Fighter) error {
	//func to insert multiple fighters

	//if fighters array is empty, don't do anything
	if len(fighters) == 0 {
		return nil
	}

	//calling the existing InsertFighter function for each fighter in the fighter array
	for _, fighter := range fighters {
		if err := InsertFighter(fighter); err != nil {
			return err
		}
	}

	return nil
}

func SelectFighter(fId int) (models.Fighter, error) {
	//func to select a fighter from the database, based on the fighter's fighter_id (Primary Key)
	//returns a fighter object created using data retrieved from DB (or an error)

	var fighter models.Fighter

	sqlStatement := "SELECT name, nickname, division_title, status, hometown, octagon_debut, image_link, girth, stance, fighter_id, fighting_style, gym, age, height, weight, reach, leg_reach FROM public.fighter WHERE fighter_id = $1;"

	row := db.QueryRowContext(context.Background(), sqlStatement, fId)

	err := row.Scan(&fighter.Name, &fighter.Nickname, &fighter.DivisionTitle, &fighter.Status,
		&fighter.Hometown, &fighter.OctagonDebut, &fighter.ImageLink, &fighter.Girth,
		&fighter.Stance, &fighter.FighterID, &fighter.FightingStyle, &fighter.Gym,
		&fighter.Age, &fighter.Height, &fighter.Weight, &fighter.Reach, &fighter.LegReach)

	if err != nil {
		if err == sql.ErrNoRows {
			//error message if no fighter is found for provided fighter id
			return fighter, fmt.Errorf("No Fighter found with given fighter id of: ", fId)
		}
		//other message for other problems
		return fighter, fmt.Errorf("Error when selecting fighter: ", err)
	}

	return fighter, nil

}
