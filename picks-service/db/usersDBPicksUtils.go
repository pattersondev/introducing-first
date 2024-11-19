package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var usersDb *sql.DB

func StartUsersDbConnection() *sql.DB {
	connStr := os.Getenv("USERS_CONNECTION_STRING")

	var err error
	usersDb, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}

	err = usersDb.Ping()
	if err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}

	return usersDb
}

// SelectPick and InsertPick seperate functions not used yet, but to be useful later as boilerplate for advanced picks (picks other than Money Line)
func SelectPick(user_id string, matchup_id string, event_id string, selection_fighter_id string) (string, error) {
	var pickId string
	sqlStatement := "SELECT pick_id FROM public.picks WHERE matchup_id = $1 AND event_id = $2 AND selection_fighter_id = $3 AND user_id = $4;"
	err := usersDb.QueryRow(sqlStatement, matchup_id, event_id, selection_fighter_id, user_id).Scan(&pickId)
	if err != nil {
		return "", fmt.Errorf("unable to retrieve pick with provided userid and other inputs %s: %w", user_id, err)
	}
	return pickId, nil
}
func InsertPick(user_id string, matchup_id string, event_id string, selection_fighter_id string) error {
	sqlStatement := "INSERT INTO public.picks (user_id, matchup_id, event_id, selection_fighter_id) VALUES ($1, $2, $3, $4);"
	//sqlStatement := "INSERT INTO public.picks (user_id, matchup_id, event_id, selection_fighter_id) VALUES ($1, $2, $3, $4);"

	_, err := usersDb.ExecContext(context.Background(), sqlStatement, user_id, matchup_id, event_id, selection_fighter_id)
	if err != nil {
		return fmt.Errorf("Unable to insert pick for user with user_id of %s: %w", user_id, err)
	}

	return nil
}

func SelectUserPicksByEvent() (string, error) {

	return pickId, nil
}

func SelectAllPicksByEvent() (string, error) {
	return picks, nil
}

// insert or update pick (to handle if someone switches their pick)
func UpsertPick(user_id string, matchup_id string, event_id string, selection_fighter_id string) error {
	//check if the pick already exists
	sqlCheck := "SELECT pick_id FROM public.picks WHERE user_id = $1 AND matchup_id = $2 AND event_id = $3;"
	var pickId string
	err := usersDb.QueryRow(sqlCheck, user_id, matchup_id, event_id).Scan(&pickId)

	if err != nil {
		if err == sql.ErrNoRows {
			//if no existing pick, insert a new one
			sqlInsert := "INSERT INTO public.picks (user_id, matchup_id, event_id, selection_fighter_id) VALUES ($1, $2, $3, $4);"
			_, err := usersDb.ExecContext(context.Background(), sqlInsert, user_id, matchup_id, event_id, selection_fighter_id)
			if err != nil {
				return fmt.Errorf("unable to insert pick: %w", err)
			}
		} else {
			//handle errors
			return fmt.Errorf("error checking for existing pick: %w", err)
		}
	} else {
		//if a pick exists, update the selection
		sqlUpdate := "UPDATE public.picks SET selection_fighter_id = $1, updated_at = CURRENT_TIMESTAMP WHERE pick_id = $2;"
		_, err := usersDb.ExecContext(context.Background(), sqlUpdate, selection_fighter_id, pickId)
		if err != nil {
			return fmt.Errorf("unable to update pick: %w", err)
		}
	}

	return nil
}
