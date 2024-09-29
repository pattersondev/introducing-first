package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var db *sql.DB

func StartDbConnection() *sql.DB {
	connStr := os.Getenv("CONNECTION_STRING")

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}

	return db
}

func insertFighter(dbpool *pgxpool.Pool, fighter models.Fighter) error {
	sql := "INSERT INTO public.fighter(name, nickname, division_title, status, hometown, octagon_debut, image_link, girth, stance, fighter_id, fighting_style, gym, age, height, weight, reach, leg_reach) VALUES ($10, $2, $3, $4, $5, $6, $7, $8, $9, $11, $12, $13, $14, $15, $16, $17);"

	_, err := dbpool.Exec(context.Background(), sql,
		fighter.FighterID, fighter.Name, fighter.Nickname, fighter.DivisionTitle, fighter.Status,
		fighter.Hometown, fighter.OctagonDebut, fighter.ImageLink, fighter.Girth, fighter.Stance,
		fighter.FightingStyle, fighter.Gym, fighter.Age, fighter.Height, fighter.Weight,
		fighter.Reach, fighter.LegReach)

	if err != nil {
		return fmt.Errorf("unable to insert fighter: %w", err)
	}
	return nil
}

// func getFighter(){
// 	sql := ''

// 	var fighter models.Fighter

// }
