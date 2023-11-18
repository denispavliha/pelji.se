# pelji.se

## Objective

The purpose of the [pelji.se](https://pelji.se) webapp is to provide access to information about the free city bus service in the area of [Nova Gorica (Slovenia, EU)](https://en.wikipedia.org/wiki/Nova_Gorica) and its surroundings, and **to encourage the use of public transportation**.

In this small town, many citizens are used to driving everywhere, even to locations within walking distance. There are public buses that are free to ride since the Municipality funds them but not many people use them, mostly with the excuse of the routes not being that frequent which is actually true. **Still, this mentality could be shifted if people were more informed about when and where the buses are driving currently.**

## Implementation

This simplistic web application visualizes city buses in Nova Gorica (Slovenia, EU) based on **static timetables**.

Routes and paths are served by an included API that actually just forwards static JSON files from the `/data/` subfolders.

There is also a functionality of live tracking buses, i.e. pushing real-time GPS location from a visitor's device in order to override the static timetable-generated bus position on the map, but has been disabled due to privacy concerns (*i.e. since going open-source, the SQLite database used for storing live positions can now be accessed, and personal data could be shared - since this is not a vital functionality, we will leave it disabled and as-is for now*).