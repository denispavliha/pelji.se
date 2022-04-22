<?php

	$db = new SQLite3('f7668ee0-ddf7-4c47-9d8d-d86bd42d0508.db');
	//$db->exec("CREATE TABLE locations(dt TEXT, path TEXT, start TEXT, direction TEXT, lat TEXT, lng TEXT)");

	header("Content-type: application/json");

	function sanitizeInput($input)
	{
		$output = urldecode($input);
		$output = strip_tags($input);

		return $output;
	}


	if (isset($_POST["path"]) && isset($_POST["start"]) && isset($_POST["direction"]) && isset($_POST["lat"]) && isset($_POST["lng"]))
	{
		$path = sanitizeInput($_POST["path"]);
		$start = sanitizeInput($_POST["start"]);
		$direction = sanitizeInput($_POST["direction"]);
		$lat = sanitizeInput($_POST["lat"]);
		$lng = sanitizeInput($_POST["lng"]);

		$now = new DateTime();
		$now = $now->format("Y-m-d H:i:s"); 

		$query = "INSERT INTO locations(dt, path, start, direction, lat, lng) VALUES('$now', '$path', '$start', '$direction', '$lat', '$lng')";
		$db->exec($query);

		http_response_code(200);
		die(json_encode(Array("status" => "OK")));		
	}

	else
	{
		if (!isset($_GET["path"]) || !isset($_GET["start"]) || !isset($_GET["direction"]) || is_null($_GET["path"]) || is_null($_GET["start"]) || is_null($_GET["direction"]))
		{
			http_response_code(400);
			die(json_encode(Array("status" => "ERROR", "message" => "Wrong input data.")));	
		}

		$path = sanitizeInput($_GET["path"]);
		$start = sanitizeInput($_GET["start"]);
		$direction = sanitizeInput($_GET["direction"]);

		$query = "SELECT dt, lat, lng, DATETIME('now', '+3597 seconds') as dt_offset FROM locations WHERE dt > dt_offset AND path='$path' AND start='$start' AND direction='$direction' ORDER BY dt DESC LIMIT 0,1";

		$res = $db->query($query);

		while ($row = $res->fetchArray()) 
		{
		    die(json_encode(Array("status" => "OK", "message" => "Here are your data.", "data" => Array("dt_offset" => $row['dt_offset'], "datetime" => $row['dt'], "lat" => $row['lat'], "lng" => $row['lng'], "path" => $path, "start" => $start, "direction" => $direction))));
		}

		http_response_code(200);
		die(json_encode(Array("status" => "ERROR", "message" => "No live tracking data available.")));	

	} 
?>