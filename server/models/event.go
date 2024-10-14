package models

type Event struct {
	Name     string      `json:"Name"`
	Date     string      `json:"Date"`
	Location string      `json:"Location"`
	Matchups []FightData `json:"matchups"`
}
