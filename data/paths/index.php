<?php

	header("Content-type: application/json");
	
	die(trim(preg_replace('/\s\s+/', ' ', file_get_contents("./ad8ab508-174f-450e-8dc8-add40697d24b.json"))));

?>