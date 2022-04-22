<?php

	header("Content-type: application/json");

	// get static data
	$settings = file_get_contents("./92532dd7-da5e-4531-9d2c-ec40067fd38c.json");

	// decode json into array
	$settings = json_decode($settings, true);

	// calculate freedays
	$year = date("Y");
	$freedays = Array(
		$year . "-01-01",
		$year . "-01-02",
		$year . "-02-08",
		$year . "-04-27",
		$year . "-05-01",
		$year . "-05-02",
		$year . "-06-25",
		$year . "-08-15",
		$year . "-10-31",
		$year . "-11-01",
		$year . "-12-25",
		$year . "-12-26"
	); 

	// inject easter
	array_push($freedays, date("Y-m-d",easter_date() + 86400));
	sort($freedays);

	// is today freeday?
	$is_today_freeday = in_array(date("Y-m-d"), $freedays) || date("w") == 0 || date("w") == 6;

	// inject freedays into settings
	$settings["freedays"] = Array(
		"list" => $freedays,
		"isTodayFreeday" => $is_today_freeday
	);
	
	// reencode json into array
	$settings = json_encode($settings);

	die(trim(preg_replace('/\s\s+/', ' ', $settings)));

?>