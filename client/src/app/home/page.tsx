"use client";

import { useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Collapse from "@mui/material/Collapse";
import useMediaQuery from "@mui/material/useMediaQuery";
import { LinearProgress } from "@mui/material";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";

const testData = [
  {
    matchup: ["Renato Moicano", "Benoit Saint Denis"],
    tale_of_the_tape: {
      "Average Fight Time": {
        "Benoit Saint Denis": "7:12",
        "Renato Moicano": "9:25",
      },
      DOB: {
        "Benoit Saint Denis": "Dec 18, 1995",
        "Renato Moicano": "May 21, 1989",
      },
      Defense: { "Benoit Saint Denis": "42%", "Renato Moicano": "60%" },
      Height: { "Benoit Saint Denis": "5' 11", "Renato Moicano": "5' 11" },
      "Loss - Dos Anjos": {
        "Benoit Saint Denis": "Win - Bonfim",
        "Renato Moicano": "Loss - Dos Anjos",
      },
      Reach: { "Benoit Saint Denis": "73", "Renato Moicano": "72" },
      Stance: {
        "Benoit Saint Denis": "Southpaw",
        "Renato Moicano": "Orthodox",
      },
      "Strikes Absorbed per Min. (SApM)": {
        "Benoit Saint Denis": "4.98",
        "Renato Moicano": "3.68",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Benoit Saint Denis": "5.70",
        "Renato Moicano": "4.38",
      },
      "Striking Accuracy": {
        "Benoit Saint Denis": "54%",
        "Renato Moicano": "48%",
      },
      "Submission Average/15 min.": {
        "Benoit Saint Denis": "1.5",
        "Renato Moicano": "0.6",
      },
      "Takedown Accuracy": {
        "Benoit Saint Denis": "37%",
        "Renato Moicano": "45%",
      },
      "Takedown Defense": {
        "Benoit Saint Denis": "69%",
        "Renato Moicano": "72%",
      },
      "Takedowns Average/15 min.": {
        "Benoit Saint Denis": "4.76",
        "Renato Moicano": "1.89",
      },
      Weight: {
        "Benoit Saint Denis": "155 lbs.",
        "Renato Moicano": "155 lbs.",
      },
      "Win - Dober": {
        "Benoit Saint Denis": "Win - Frevola",
        "Renato Moicano": "Win - Dober",
      },
      "Win - Hernandez": {
        "Benoit Saint Denis": "Win - Miranda",
        "Renato Moicano": "Win - Hernandez",
      },
      "Win - Riddell": {
        "Benoit Saint Denis": "Win - Moises",
        "Renato Moicano": "Win - Riddell",
      },
      "Win - Turner": {
        "Benoit Saint Denis": "Loss - Poirier",
        "Renato Moicano": "Win - Turner",
      },
      "Wins/Losses/Draws": {
        "Benoit Saint Denis": "13-2-0 (1 NC)",
        "Renato Moicano": "19-5-1",
      },
    },
  },
  {
    matchup: ["William Gomis", "Joanderson Brito"],
    tale_of_the_tape: {
      "": { "Joanderson Brito": "Win - Fili", "William Gomis": "" },
      "Average Fight Time": {
        "Joanderson Brito": "6:54",
        "William Gomis": "14:07",
      },
      DOB: {
        "Joanderson Brito": "Feb 11, 1995",
        "William Gomis": "Jun 13, 1997",
      },
      Defense: { "Joanderson Brito": "46%", "William Gomis": "75%" },
      Height: { "Joanderson Brito": "5' 8", "William Gomis": "6' 0" },
      Reach: { "Joanderson Brito": "72", "William Gomis": "73" },
      Stance: { "Joanderson Brito": "Orthodox", "William Gomis": "Southpaw" },
      "Strikes Absorbed per Min. (SApM)": {
        "Joanderson Brito": "2.65",
        "William Gomis": "1.49",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Joanderson Brito": "3.35",
        "William Gomis": "2.62",
      },
      "Striking Accuracy": {
        "Joanderson Brito": "51%",
        "William Gomis": "46%",
      },
      "Submission Average/15 min.": {
        "Joanderson Brito": "0.6",
        "William Gomis": "0.7",
      },
      "Takedown Accuracy": {
        "Joanderson Brito": "76%",
        "William Gomis": "60%",
      },
      "Takedown Defense": { "Joanderson Brito": "62%", "William Gomis": "81%" },
      "Takedowns Average/15 min.": {
        "Joanderson Brito": "3.11",
        "William Gomis": "1.06",
      },
      Weight: { "Joanderson Brito": "145 lbs.", "William Gomis": "145 lbs." },
      "Win - Errens": {
        "Joanderson Brito": "Win - Wilson",
        "William Gomis": "Win - Errens",
      },
      "Win - Ghemmouri": {
        "Joanderson Brito": "Win - Shore",
        "William Gomis": "Win - Ghemmouri",
      },
      "Win - Marshall": {
        "Joanderson Brito": "Win - Pearce",
        "William Gomis": "Win - Marshall",
      },
      "Wins/Losses/Draws": {
        "Joanderson Brito": "17-3-1",
        "William Gomis": "13-2-0",
      },
    },
  },
  {
    matchup: ["Kevin Jousset", "Bryan Battle"],
    tale_of_the_tape: {
      "": { "Bryan Battle": "Win - Sato", "Kevin Jousset": "" },
      "Average Fight Time": { "Bryan Battle": "7:41", "Kevin Jousset": "9:55" },
      DOB: { "Bryan Battle": "Sep 21, 1994", "Kevin Jousset": "May 02, 1993" },
      Defense: { "Bryan Battle": "44%", "Kevin Jousset": "53%" },
      Height: { "Bryan Battle": "6' 1", "Kevin Jousset": "6' 2" },
      Reach: { "Bryan Battle": "77", "Kevin Jousset": "75" },
      Stance: { "Bryan Battle": "Orthodox", "Kevin Jousset": "Orthodox" },
      "Strikes Absorbed per Min. (SApM)": {
        "Bryan Battle": "3.74",
        "Kevin Jousset": "5.10",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Bryan Battle": "4.52",
        "Kevin Jousset": "8.23",
      },
      "Striking Accuracy": { "Bryan Battle": "51%", "Kevin Jousset": "55%" },
      "Submission Average/15 min.": {
        "Bryan Battle": "0.6",
        "Kevin Jousset": "0.8",
      },
      "Takedown Accuracy": { "Bryan Battle": "28%", "Kevin Jousset": "66%" },
      "Takedown Defense": { "Bryan Battle": "47%", "Kevin Jousset": "100%" },
      "Takedowns Average/15 min.": {
        "Bryan Battle": "1.12",
        "Kevin Jousset": "1.51",
      },
      Weight: { "Bryan Battle": "170 lbs.", "Kevin Jousset": "170 lbs." },
      "Win - Crosbie": {
        "Bryan Battle": "Win - Fletcher",
        "Kevin Jousset": "Win - Crosbie",
      },
      "Win - Kenan": {
        "Bryan Battle": "No Contest - Loosa",
        "Kevin Jousset": "Win - Kenan",
      },
      "Wins/Losses/Draws": {
        "Bryan Battle": "11-2-0 (1 NC)",
        "Kevin Jousset": "10-2-0",
      },
    },
  },
  {
    matchup: ["Nassourdine Imavov", "Brendan Allen"],
    tale_of_the_tape: {
      "Average Fight Time": {
        "Brendan Allen": "9:45",
        "Nassourdine Imavov": "15:18",
      },
      DOB: {
        "Brendan Allen": "Dec 28, 1995",
        "Nassourdine Imavov": "Mar 01, 1995",
      },
      Defense: { "Brendan Allen": "47%", "Nassourdine Imavov": "59%" },
      Height: { "Brendan Allen": "6' 2", "Nassourdine Imavov": "6' 3" },
      "Loss - Strickland": {
        "Brendan Allen": "Win - Muniz",
        "Nassourdine Imavov": "Loss - Strickland",
      },
      "No Contest - Curtis": {
        "Brendan Allen": "Win - Silva",
        "Nassourdine Imavov": "No Contest - Curtis",
      },
      Reach: { "Brendan Allen": "75", "Nassourdine Imavov": "75" },
      Stance: { "Brendan Allen": "Orthodox", "Nassourdine Imavov": "Orthodox" },
      "Strikes Absorbed per Min. (SApM)": {
        "Brendan Allen": "3.83",
        "Nassourdine Imavov": "3.33",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Brendan Allen": "3.98",
        "Nassourdine Imavov": "4.58",
      },
      "Striking Accuracy": {
        "Brendan Allen": "53%",
        "Nassourdine Imavov": "55%",
      },
      "Submission Average/15 min.": {
        "Brendan Allen": "1.4",
        "Nassourdine Imavov": "1.3",
      },
      "Takedown Accuracy": {
        "Brendan Allen": "47%",
        "Nassourdine Imavov": "36%",
      },
      "Takedown Defense": {
        "Brendan Allen": "58%",
        "Nassourdine Imavov": "74%",
      },
      "Takedowns Average/15 min.": {
        "Brendan Allen": "1.74",
        "Nassourdine Imavov": "0.98",
      },
      Weight: { "Brendan Allen": "185 lbs.", "Nassourdine Imavov": "185 lbs." },
      "Win - Buckley": {
        "Brendan Allen": "Win - Jotko",
        "Nassourdine Imavov": "Win - Buckley",
      },
      "Win - Cannonier": {
        "Brendan Allen": "Win - Curtis",
        "Nassourdine Imavov": "Win - Cannonier",
      },
      "Win - Dolidze": {
        "Brendan Allen": "Win - Craig",
        "Nassourdine Imavov": "Win - Dolidze",
      },
      "Wins/Losses/Draws": {
        "Brendan Allen": "24-5-0",
        "Nassourdine Imavov": "14-4-0 (1 NC)",
      },
    },
  },
  {
    matchup: ["Morgan Charriere", "Gabriel Miranda"],
    tale_of_the_tape: {
      "": { "Gabriel Miranda": "", "Morgan Charriere": "" },
      "Average Fight Time": {
        "Gabriel Miranda": "3:08",
        "Morgan Charriere": "9:26",
      },
      DOB: {
        "Gabriel Miranda": "Mar 25, 1990",
        "Morgan Charriere": "Oct 26, 1995",
      },
      Defense: { "Gabriel Miranda": "39%", "Morgan Charriere": "55%" },
      Height: { "Gabriel Miranda": "5' 11", "Morgan Charriere": "5' 8" },
      "Loss - Mariscal": {
        "Gabriel Miranda": "Win - Young",
        "Morgan Charriere": "Loss - Mariscal",
      },
      Reach: { "Gabriel Miranda": "71", "Morgan Charriere": "69" },
      Stance: { "Gabriel Miranda": "Orthodox", "Morgan Charriere": "Orthodox" },
      "Strikes Absorbed per Min. (SApM)": {
        "Gabriel Miranda": "6.88",
        "Morgan Charriere": "4.24",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Gabriel Miranda": "3.52",
        "Morgan Charriere": "3.98",
      },
      "Striking Accuracy": {
        "Gabriel Miranda": "51%",
        "Morgan Charriere": "49%",
      },
      "Submission Average/15 min.": {
        "Gabriel Miranda": "2.4",
        "Morgan Charriere": "0.8",
      },
      "Takedown Accuracy": {
        "Gabriel Miranda": "40%",
        "Morgan Charriere": "40%",
      },
      "Takedown Defense": {
        "Gabriel Miranda": "0%",
        "Morgan Charriere": "87%",
      },
      "Takedowns Average/15 min.": {
        "Gabriel Miranda": "4.80",
        "Morgan Charriere": "1.59",
      },
      Weight: { "Gabriel Miranda": "145 lbs.", "Morgan Charriere": "145 lbs." },
      "Win - Zecchini": {
        "Gabriel Miranda": "Loss - Saint Denis",
        "Morgan Charriere": "Win - Zecchini",
      },
      "Wins/Losses/Draws": {
        "Gabriel Miranda": "17-6-0",
        "Morgan Charriere": "19-10-1",
      },
    },
  },
  {
    matchup: ["Fares Ziam", "Matt Frevola"],
    tale_of_the_tape: {
      "Average Fight Time": { "Fares Ziam": "13:10", "Matt Frevola": "7:22" },
      DOB: { "Fares Ziam": "Mar 21, 1997", "Matt Frevola": "Jun 11, 1990" },
      Defense: { "Fares Ziam": "65%", "Matt Frevola": "59%" },
      Height: { "Fares Ziam": "6' 1", "Matt Frevola": "5' 9" },
      "Loss - McKinney": {
        "Fares Ziam": "Loss - McKinney",
        "Matt Frevola": "Win - Valdez",
      },
      Reach: { "Fares Ziam": "75", "Matt Frevola": "71" },
      Stance: { "Fares Ziam": "Orthodox", "Matt Frevola": "Orthodox" },
      "Strikes Absorbed per Min. (SApM)": {
        "Fares Ziam": "1.72",
        "Matt Frevola": "3.57",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Fares Ziam": "2.70",
        "Matt Frevola": "3.71",
      },
      "Striking Accuracy": { "Fares Ziam": "48%", "Matt Frevola": "42%" },
      "Submission Average/15 min.": {
        "Fares Ziam": "0.2",
        "Matt Frevola": "0.9",
      },
      "Takedown Accuracy": { "Fares Ziam": "23%", "Matt Frevola": "40%" },
      "Takedown Defense": { "Fares Ziam": "67%", "Matt Frevola": "42%" },
      "Takedowns Average/15 min.": {
        "Fares Ziam": "0.81",
        "Matt Frevola": "2.59",
      },
      Weight: { "Fares Ziam": "155 lbs.", "Matt Frevola": "155 lbs." },
      "Win - Figlak": {
        "Fares Ziam": "Win - Figlak",
        "Matt Frevola": "Win - Azaitar",
      },
      "Win - Herbert": {
        "Fares Ziam": "Win - Herbert",
        "Matt Frevola": "Win - Dober",
      },
      "Win - Puelles": {
        "Fares Ziam": "Win - Puelles",
        "Matt Frevola": "Loss - Saint Denis",
      },
      "Win - Vendramini": {
        "Fares Ziam": "Win - Vendramini",
        "Matt Frevola": "Loss - McKinney",
      },
      "Wins/Losses/Draws": { "Fares Ziam": "15-4-0", "Matt Frevola": "11-4-1" },
    },
  },
  {
    matchup: ["Ion Cutelaba", "Ivan Erslan"],
    tale_of_the_tape: {
      "Average Fight Time": { "Ion Cutelaba": "7:39", "Ivan Erslan": "" },
      DOB: { "Ion Cutelaba": "Dec 14, 1993", "Ivan Erslan": "Nov 15, 1991" },
      Defense: { "Ion Cutelaba": "47%", "Ivan Erslan": "0%" },
      Height: { "Ion Cutelaba": "6' 1", "Ivan Erslan": "" },
      "Loss - Lins": { "Ion Cutelaba": "Loss - Lins", "Ivan Erslan": "" },
      "Loss - Nzechukwu": {
        "Ion Cutelaba": "Loss - Nzechukwu",
        "Ivan Erslan": "",
      },
      "Loss - Spann": { "Ion Cutelaba": "Loss - Spann", "Ivan Erslan": "" },
      "Loss - Walker": { "Ion Cutelaba": "Loss - Walker", "Ivan Erslan": "" },
      Reach: { "Ion Cutelaba": "75", "Ivan Erslan": "" },
      Stance: { "Ion Cutelaba": "Southpaw", "Ivan Erslan": "" },
      "Strikes Absorbed per Min. (SApM)": {
        "Ion Cutelaba": "3.43",
        "Ivan Erslan": "0.00",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Ion Cutelaba": "4.44",
        "Ivan Erslan": "0.00",
      },
      "Striking Accuracy": { "Ion Cutelaba": "43%", "Ivan Erslan": "0%" },
      "Submission Average/15 min.": {
        "Ion Cutelaba": "0.0",
        "Ivan Erslan": "0.0",
      },
      "Takedown Accuracy": { "Ion Cutelaba": "57%", "Ivan Erslan": "0%" },
      "Takedown Defense": { "Ion Cutelaba": "76%", "Ivan Erslan": "0%" },
      "Takedowns Average/15 min.": {
        "Ion Cutelaba": "4.17",
        "Ivan Erslan": "0.00",
      },
      Weight: { "Ion Cutelaba": "205 lbs.", "Ivan Erslan": "205 lbs." },
      "Win - Boser": { "Ion Cutelaba": "Win - Boser", "Ivan Erslan": "" },
      "Wins/Losses/Draws": {
        "Ion Cutelaba": "17-10-1 (1 NC)",
        "Ivan Erslan": "14-3-0",
      },
    },
  },
  {
    matchup: ["Oumar Sy", "Da Woon Jung"],
    tale_of_the_tape: {
      "": { "Da Woon Jung": "Win - Knight", "Oumar Sy": "" },
      "Average Fight Time": { "Da Woon Jung": "9:54", "Oumar Sy": "3:43" },
      DOB: { "Da Woon Jung": "Dec 07, 1993", "Oumar Sy": "Nov 21, 1995" },
      Defense: { "Da Woon Jung": "51%", "Oumar Sy": "25%" },
      Height: { "Da Woon Jung": "6' 4", "Oumar Sy": "6' 4" },
      Reach: { "Da Woon Jung": "78", "Oumar Sy": "83" },
      Stance: { "Da Woon Jung": "Orthodox", "Oumar Sy": "Orthodox" },
      "Strikes Absorbed per Min. (SApM)": {
        "Da Woon Jung": "3.89",
        "Oumar Sy": "0.81",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Da Woon Jung": "3.49",
        "Oumar Sy": "0.00",
      },
      "Striking Accuracy": { "Da Woon Jung": "43%", "Oumar Sy": "0%" },
      "Submission Average/15 min.": {
        "Da Woon Jung": "0.2",
        "Oumar Sy": "4.0",
      },
      "Takedown Accuracy": { "Da Woon Jung": "50%", "Oumar Sy": "66%" },
      "Takedown Defense": { "Da Woon Jung": "77%", "Oumar Sy": "0%" },
      "Takedowns Average/15 min.": {
        "Da Woon Jung": "1.90",
        "Oumar Sy": "8.07",
      },
      Weight: { "Da Woon Jung": "205 lbs.", "Oumar Sy": "205 lbs." },
      "Win - Tokkos": {
        "Da Woon Jung": "Loss - Ulberg",
        "Oumar Sy": "Win - Tokkos",
      },
      "Wins/Losses/Draws": { "Da Woon Jung": "15-5-1", "Oumar Sy": "10-0-0" },
    },
  },
  {
    matchup: ["Ludovit Klein", "Roosevelt Roberts"],
    tale_of_the_tape: {
      "Average Fight Time": {
        "Ludovit Klein": "12:02",
        "Roosevelt Roberts": "8:39",
      },
      DOB: {
        "Ludovit Klein": "Feb 22, 1995",
        "Roosevelt Roberts": "Feb 11, 1994",
      },
      Defense: { "Ludovit Klein": "53%", "Roosevelt Roberts": "52%" },
      "Draw - Herbert": {
        "Ludovit Klein": "Draw - Herbert",
        "Roosevelt Roberts": "Loss - Miller",
      },
      Height: { "Ludovit Klein": "5' 7", "Roosevelt Roberts": "6' 2" },
      Reach: { "Ludovit Klein": "72", "Roosevelt Roberts": "73" },
      Stance: { "Ludovit Klein": "Southpaw", "Roosevelt Roberts": "Orthodox" },
      "Strikes Absorbed per Min. (SApM)": {
        "Ludovit Klein": "3.45",
        "Roosevelt Roberts": "3.12",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Ludovit Klein": "3.93",
        "Roosevelt Roberts": "3.05",
      },
      "Striking Accuracy": {
        "Ludovit Klein": "55%",
        "Roosevelt Roberts": "44%",
      },
      "Submission Average/15 min.": {
        "Ludovit Klein": "0.0",
        "Roosevelt Roberts": "0.9",
      },
      "Takedown Accuracy": {
        "Ludovit Klein": "50%",
        "Roosevelt Roberts": "29%",
      },
      "Takedown Defense": {
        "Ludovit Klein": "90%",
        "Roosevelt Roberts": "52%",
      },
      "Takedowns Average/15 min.": {
        "Ludovit Klein": "1.66",
        "Roosevelt Roberts": "1.39",
      },
      Weight: { "Ludovit Klein": "155 lbs.", "Roosevelt Roberts": "155 lbs." },
      "Win - Bahamondes": {
        "Ludovit Klein": "Win - Bahamondes",
        "Roosevelt Roberts": "No Contest - Croom",
      },
      "Win - Cunningham": {
        "Ludovit Klein": "Win - Cunningham",
        "Roosevelt Roberts": "Loss - Bahamondes",
      },
      "Win - Jones": {
        "Ludovit Klein": "Win - Jones",
        "Roosevelt Roberts": "Win - Weaver",
      },
      "Win - Moises": {
        "Ludovit Klein": "Win - Moises",
        "Roosevelt Roberts": "Loss - Rebecki",
      },
      "Wins/Losses/Draws": {
        "Ludovit Klein": "22-4-1",
        "Roosevelt Roberts": "12-5-0 (1 NC)",
      },
    },
  },
  {
    matchup: ["Daria Zhelezniakova", "Ailin Perez"],
    tale_of_the_tape: {
      "": { "Ailin Perez": "", "Daria Zhelezniakova": "" },
      "Average Fight Time": {
        "Ailin Perez": "13:44",
        "Daria Zhelezniakova": "15:00",
      },
      DOB: {
        "Ailin Perez": "Oct 05, 1994",
        "Daria Zhelezniakova": "Jan 23, 1996",
      },
      Defense: { "Ailin Perez": "57%", "Daria Zhelezniakova": "82%" },
      Height: { "Ailin Perez": "5' 5", "Daria Zhelezniakova": "5' 9" },
      Reach: { "Ailin Perez": "66", "Daria Zhelezniakova": "68" },
      Stance: { "Ailin Perez": "Switch", "Daria Zhelezniakova": "" },
      "Strikes Absorbed per Min. (SApM)": {
        "Ailin Perez": "1.35",
        "Daria Zhelezniakova": "1.67",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Ailin Perez": "2.91",
        "Daria Zhelezniakova": "3.80",
      },
      "Striking Accuracy": {
        "Ailin Perez": "58%",
        "Daria Zhelezniakova": "38%",
      },
      "Submission Average/15 min.": {
        "Ailin Perez": "0.0",
        "Daria Zhelezniakova": "0.0",
      },
      "Takedown Accuracy": {
        "Ailin Perez": "51%",
        "Daria Zhelezniakova": "0%",
      },
      "Takedown Defense": {
        "Ailin Perez": "75%",
        "Daria Zhelezniakova": "50%",
      },
      "Takedowns Average/15 min.": {
        "Ailin Perez": "5.19",
        "Daria Zhelezniakova": "0.00",
      },
      Weight: { "Ailin Perez": "135 lbs.", "Daria Zhelezniakova": "135 lbs." },
      "Win - Rendon": {
        "Ailin Perez": "Win - Edwards",
        "Daria Zhelezniakova": "Win - Rendon",
      },
      "Wins/Losses/Draws": {
        "Ailin Perez": "10-2-0",
        "Daria Zhelezniakova": "9-1-0",
      },
    },
  },
  {
    matchup: ["Daniel Barez", "Victor Altamirano"],
    tale_of_the_tape: {
      "": { "Daniel Barez": "", "Victor Altamirano": "Loss - Hernandez" },
      "Average Fight Time": {
        "Daniel Barez": "9:13",
        "Victor Altamirano": "13:07",
      },
      DOB: {
        "Daniel Barez": "Dec 10, 1988",
        "Victor Altamirano": "Jan 23, 1991",
      },
      Defense: { "Daniel Barez": "55%", "Victor Altamirano": "54%" },
      Height: { "Daniel Barez": "5' 6", "Victor Altamirano": "5' 8" },
      "Loss - Filho": {
        "Daniel Barez": "Loss - Filho",
        "Victor Altamirano": "Loss - dos Santos",
      },
      "Loss - Hernandez": {
        "Daniel Barez": "Loss - Hernandez",
        "Victor Altamirano": "Loss - Elliott",
      },
      Reach: { "Daniel Barez": "66", "Victor Altamirano": "70" },
      Stance: { "Daniel Barez": "Orthodox", "Victor Altamirano": "Switch" },
      "Strikes Absorbed per Min. (SApM)": {
        "Daniel Barez": "5.32",
        "Victor Altamirano": "3.70",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Daniel Barez": "3.80",
        "Victor Altamirano": "4.55",
      },
      "Striking Accuracy": {
        "Daniel Barez": "53%",
        "Victor Altamirano": "57%",
      },
      "Submission Average/15 min.": {
        "Daniel Barez": "1.6",
        "Victor Altamirano": "0.0",
      },
      "Takedown Accuracy": {
        "Daniel Barez": "31%",
        "Victor Altamirano": "39%",
      },
      "Takedown Defense": { "Daniel Barez": "91%", "Victor Altamirano": "63%" },
      "Takedowns Average/15 min.": {
        "Daniel Barez": "4.07",
        "Victor Altamirano": "3.43",
      },
      Weight: { "Daniel Barez": "125 lbs.", "Victor Altamirano": "125 lbs." },
      "Wins/Losses/Draws": {
        "Daniel Barez": "16-6-0",
        "Victor Altamirano": "12-4-0",
      },
    },
  },
  {
    matchup: ["Germaine de Randamie", "Nora Cornolle"],
    tale_of_the_tape: {
      "Average Fight Time": {
        "Germaine de Randamie": "12:08",
        "Nora Cornolle": "11:33",
      },
      DOB: {
        "Germaine de Randamie": "Apr 24, 1984",
        "Nora Cornolle": "Dec 06, 1989",
      },
      Defense: { "Germaine de Randamie": "65%", "Nora Cornolle": "56%" },
      Height: { "Germaine de Randamie": "5' 9", "Nora Cornolle": "5' 7" },
      "Loss - Dumont": {
        "Germaine de Randamie": "Loss - Dumont",
        "Nora Cornolle": "Win - Mullins",
      },
      "Loss - Nunes": {
        "Germaine de Randamie": "Loss - Nunes",
        "Nora Cornolle": "",
      },
      Reach: { "Germaine de Randamie": "71", "Nora Cornolle": "67" },
      Stance: {
        "Germaine de Randamie": "Orthodox",
        "Nora Cornolle": "Orthodox",
      },
      "Strikes Absorbed per Min. (SApM)": {
        "Germaine de Randamie": "2.00",
        "Nora Cornolle": "1.26",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Germaine de Randamie": "2.57",
        "Nora Cornolle": "3.29",
      },
      "Striking Accuracy": {
        "Germaine de Randamie": "46%",
        "Nora Cornolle": "59%",
      },
      "Submission Average/15 min.": {
        "Germaine de Randamie": "0.4",
        "Nora Cornolle": "0.0",
      },
      "Takedown Accuracy": {
        "Germaine de Randamie": "0%",
        "Nora Cornolle": "0%",
      },
      "Takedown Defense": {
        "Germaine de Randamie": "65%",
        "Nora Cornolle": "50%",
      },
      "Takedowns Average/15 min.": {
        "Germaine de Randamie": "0.00",
        "Nora Cornolle": "0.00",
      },
      Weight: {
        "Germaine de Randamie": "135 lbs.",
        "Nora Cornolle": "135 lbs.",
      },
      "Win - Ladd": {
        "Germaine de Randamie": "Win - Ladd",
        "Nora Cornolle": "",
      },
      "Win - Pena": {
        "Germaine de Randamie": "Win - Pena",
        "Nora Cornolle": "Win - Edwards",
      },
      "Win - Pennington": {
        "Germaine de Randamie": "Win - Pennington",
        "Nora Cornolle": "",
      },
      "Wins/Losses/Draws": {
        "Germaine de Randamie": "10-5-0",
        "Nora Cornolle": "8-1-0",
      },
    },
  },
  {
    matchup: ["Bolaji Oki", "Chris Duncan"],
    tale_of_the_tape: {
      "": { "Bolaji Oki": "", "Chris Duncan": "Loss - Borshchev" },
      "Average Fight Time": { "Bolaji Oki": "8:53", "Chris Duncan": "7:47" },
      DOB: { "Bolaji Oki": "Nov 15, 1995", "Chris Duncan": "May 10, 1993" },
      Defense: { "Bolaji Oki": "64%", "Chris Duncan": "49%" },
      Height: { "Bolaji Oki": "5' 10", "Chris Duncan": "5' 10" },
      Reach: { "Bolaji Oki": "73", "Chris Duncan": "71" },
      Stance: { "Bolaji Oki": "Orthodox", "Chris Duncan": "Orthodox" },
      "Strikes Absorbed per Min. (SApM)": {
        "Bolaji Oki": "2.53",
        "Chris Duncan": "3.65",
      },
      "Strikes Landed per Min. (SLpM)": {
        "Bolaji Oki": "5.18",
        "Chris Duncan": "4.88",
      },
      "Striking Accuracy": { "Bolaji Oki": "43%", "Chris Duncan": "46%" },
      "Submission Average/15 min.": {
        "Bolaji Oki": "0.0",
        "Chris Duncan": "0.0",
      },
      "Takedown Accuracy": { "Bolaji Oki": "100%", "Chris Duncan": "38%" },
      "Takedown Defense": { "Bolaji Oki": "83%", "Chris Duncan": "33%" },
      "Takedowns Average/15 min.": {
        "Bolaji Oki": "0.84",
        "Chris Duncan": "3.85",
      },
      Weight: { "Bolaji Oki": "155 lbs.", "Chris Duncan": "155 lbs." },
      "Win - Cuamba": {
        "Bolaji Oki": "Win - Cuamba",
        "Chris Duncan": "Loss - Torres",
      },
      "Win - Salvador": {
        "Bolaji Oki": "Win - Salvador",
        "Chris Duncan": "Win - Ashmouz",
      },
      "Wins/Losses/Draws": { "Bolaji Oki": "9-1-0", "Chris Duncan": "11-2-0" },
    },
  },
];

interface Event {
  name: string;
  date: string;
  venue: string;
  location: string;
}

const testEvents: Event[] = [
  {
    name: "UFC 307: Pereira vs. Rountree Jr.",
    date: "October 5, 2024",
    venue: "Delta Center",
    location: "Salt Lake City, UT",
  },
  {
    name: "UFC Fight Night: Imavov vs. Allen",
    date: "September 14, 2024",
    venue: "UFC APEX",
    location: "Las Vegas, NV",
  },
  {
    name: "UFC 300",
    date: "April 13, 2024",
    venue: "T-Mobile Arena",
    location: "Las Vegas, NV",
  },
  // ... add more events as needed
];

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function Home() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event>(testEvents[0]);
  const isMobile = useMediaQuery("(max-width:600px)");

  const handleCardClick = (matchup: string) => {
    setExpandedCard((prevExpanded) =>
      prevExpanded === matchup ? null : matchup
    );
  };

  const handleEventChange = (event: SelectChangeEvent<string>) => {
    const newEvent = testEvents.find((e) => e.name === event.target.value);
    if (newEvent) {
      setSelectedEvent(newEvent);
    }
  };

  const getWinProbabilityColor = (probability: number) => {
    if (probability > 50) return "#4caf50"; // green
    if (probability < 50) return "#f44336"; // red
    return "#ffffff"; // white
  };

  return (
    <div
      style={{
        backgroundColor: "#26303f",
        minHeight: "100vh",
        padding: isMobile ? "5px" : "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: isMobile ? "95%" : "87.5%",
          maxWidth: "625px",
          margin: "0 auto",
        }}
      >
        <Card style={{ marginBottom: "19px", backgroundColor: "#2f3949" }}>
          <CardContent>
            <FormControl fullWidth>
              <Select
                value={selectedEvent.name}
                onChange={handleEventChange}
                style={{ color: "#c3c0d6" }}
              >
                {testEvents.map((event) => (
                  <MenuItem key={event.name} value={event.name}>
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              style={{ color: "#c3c0d6", marginTop: "10px", fontSize: "1rem" }}
            >
              {selectedEvent.date}
            </Typography>
            <Typography style={{ color: "#c3c0d6", fontSize: "0.9rem" }}>
              {selectedEvent.venue}, {selectedEvent.location}
            </Typography>
          </CardContent>
        </Card>
        {testData.map((fight) => (
          <Card
            key={fight.matchup.join("-")}
            onClick={() => handleCardClick(fight.matchup.join("-"))}
            style={{
              cursor: "pointer",
              marginBottom: "10px",
              backgroundColor: "#2f3949",
              color: "#c3c0d6",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                padding: "10px",
                borderBottom: "1px solid #c3c0d6",
                fontSize: isMobile ? "0.875rem" : "1.0625rem",
                color: "#c3c0d6",
                fontWeight: "bold",
              }}
            >
              {fight.tale_of_the_tape.Weight[
                fight.matchup[0] as keyof typeof fight.tale_of_the_tape.Weight
              ] ?? "N/A"}
            </div>
            <CardContent style={{ padding: isMobile ? "12.5px" : "18.75px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {fight.matchup.map((fighter, index) => {
                  const winProbability = index === 0 ? 55 : 45;

                  return (
                    <div
                      key={fighter}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: index === 0 ? "flex-start" : "flex-end",
                        width: "45%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        {index === 0 ? (
                          <>
                            <img
                              src={`/images/${fighter}.jpg`}
                              alt={`${fighter} fighter image`}
                              width={isMobile ? 48 : 62}
                              height={isMobile ? 48 : 62}
                              style={{
                                marginRight: "10px",
                                borderRadius: "50%",
                              }}
                            />
                            <span
                              style={{
                                fontSize: isMobile ? "0.9375rem" : "1.25rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {fighter}
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              style={{
                                fontSize: isMobile ? "0.9375rem" : "1.25rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textAlign: "right",
                              }}
                            >
                              {fighter}
                            </span>
                            <img
                              src={`/images/${fighter}.jpg`}
                              alt={`${fighter} fighter image`}
                              width={isMobile ? 48 : 62}
                              height={isMobile ? 48 : 62}
                              style={{
                                marginLeft: "10px",
                                borderRadius: "50%",
                              }}
                            />
                          </>
                        )}
                      </div>
                      <div style={{ width: "100%" }}>
                        <LinearProgress
                          variant="determinate"
                          value={winProbability}
                          style={{
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: "#444",
                            transform: index === 1 ? "rotate(180deg)" : "none",
                          }}
                          sx={{
                            "& .MuiLinearProgress-bar": {
                              backgroundColor:
                                getWinProbabilityColor(winProbability),
                              transform:
                                index === 1 ? "translateX(-100%)" : "none",
                            },
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              index === 0 ? "flex-start" : "flex-end",
                            fontSize: "0.9375rem",
                            marginTop: "3px",
                          }}
                        >
                          {winProbability}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <Collapse
              in={expandedCard === fight.matchup.join("-")}
              timeout="auto"
              unmountOnExit
            >
              <CardContent
                style={{
                  backgroundColor: "#2f3949",
                  padding: isMobile ? "12.5px" : "18.75px",
                }}
              >
                {Object.entries(fight.tale_of_the_tape).map(([key, value]) => {
                  if (key === "") return null;

                  if (key === "DOB") {
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <Typography
                          style={{
                            color: "#c3c0d6",
                            width: "40%",
                            textAlign: "left",
                            fontSize: isMobile ? "0.9375rem" : "1.125rem",
                          }}
                        >
                          {calculateAge(value[fight.matchup[0]])}
                        </Typography>
                        <Typography
                          style={{
                            color: "#c3c0d6",
                            width: "20%",
                            textAlign: "center",
                            fontSize: isMobile ? "1.0625rem" : "1.25rem",
                            fontWeight: "bolder",
                          }}
                        >
                          Age
                        </Typography>
                        <Typography
                          style={{
                            color: "#c3c0d6",
                            width: "40%",
                            textAlign: "right",
                            fontSize: isMobile ? "0.9375rem" : "1.125rem",
                          }}
                        >
                          {calculateAge(value[fight.matchup[1]])}
                        </Typography>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <Typography
                        style={{
                          color: "#c3c0d6",
                          width: "40%",
                          textAlign: "left",
                          fontSize: isMobile ? "0.9375rem" : "1.125rem",
                        }}
                      >
                        {value[fight.matchup[0]]}
                      </Typography>
                      <Typography
                        style={{
                          color: "#c3c0d6",
                          width: "20%",
                          textAlign: "center",
                          fontSize: isMobile ? "1.0625rem" : "1.25rem",
                          fontWeight: "bolder",
                        }}
                      >
                        {key}
                      </Typography>
                      <Typography
                        style={{
                          color: "#c3c0d6",
                          width: "40%",
                          textAlign: "right",
                          fontSize: isMobile ? "0.9375rem" : "1.125rem",
                        }}
                      >
                        {value[fight.matchup[1]]}
                      </Typography>
                    </div>
                  );
                })}
              </CardContent>
            </Collapse>
          </Card>
        ))}
      </div>
    </div>
  );
}
