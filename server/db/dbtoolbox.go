package db

import (
	_ "github.com/lib/pq"
)

func insertFighter(dbpool *pgxpool.Pool, fighter models.Fighter) error{
	sql := 'INSERT INTO public.fighter(
	name, nickname, division_title, status, hometown, octagon_debut, image_link, girth, stance, fighter_id, fighting_style, gym, age, height, weight, reach, leg_reach)
	VALUES ($10, $2, $3, $4, $5, $6, $7, $8, $9, , $11, $12, $13, $14, $15, $16, $17);'
}
