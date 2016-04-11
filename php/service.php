<?php
	// DB connection and setup
	require_once("db.php");
	$conn["table"] = "microsite_pdf";
	$table_cat = $conn["table"] . "_categories";
	$table_pdf = $conn["table"] . "_list";
	$table_users = "microsite_users";
	$db = mysqli_connect($conn["hostname"], $conn["username"], $conn["password"]) or die("Connecting to MySQL failed");
	mysqli_select_db($db, $conn["database"]) or die("Selecting MySQL database failed");

	// get args and set initial values
	$id = isset($_POST["pk"]) ? $_POST["pk"] : null;
	$name = isset($_POST["name"]) ? $_POST["name"] : null;
	$value = isset($_POST["value"]) ? mysqli_real_escape_string($db, $_POST["value"]) : null;
	$action = isset($_POST["action"]) ? $_POST["action"] : $name;
	$message = "placeholder";
	$reload = false;

	// roll through the possible actions and set query accordingly
	switch ($action) {
		case "display_name":
		case "update_cat_id":
			$query = "update $table_pdf set $name='$value' where id=$id";
			break;
		case "modify_cat_name":
			$query = "update $table_cat set $name='$value' where id=$id";
			$reload = true;
			break;
		case "position":
			$query = "update $table_cat set position='$value' where id=$id";
			$reload = true;
			break;
		case "upload_image":
		case "upload_pdf":
			$upload_name = mysqli_real_escape_string($db, $_FILES["file"]["name"]);
			if ( 0 < $_FILES["file"]["error"] ) {
				$success = false;
				$message = "File upload error (" . $_FILES["file"]["error"] . ")";
			} else if (move_uploaded_file($_FILES["file"]["tmp_name"], "../files/$upload_name")) {
				$query = "update $table_pdf set $name='$upload_name' where id=$id";
				$reload = true;
			}
			break;
		case "delete_cat":
			$query = "delete from $table_cat where id=$id limit 1; delete from $table_pdf where category_id=$id";
			$reload = true;
			break;
		case "delete_pdf":
			$query = "delete from $table_pdf where id=$id limit 1";
			$reload = true;
			break;
		case "add_cat":
			$query = "insert into $table_cat values()";
			$reload = true;
			break;
		case "add_pdf":
			$query = "insert into $table_pdf values()";
			$reload = true;
			break;
		case "add_user":
			$tmp_username = substr(md5(uniqid(8)), 0, 8);
			$tmp_password = substr(md5(uniqid(8)), 0, 8);

			$query = "insert into $table_users(username, password) values('$tmp_username', '$tmp_password')";
			$reload = true;
			break;
		case "delete_user":
			$query = "delete from $table_users where id=$id limit 1";
			$reload = true;
			break;
		case "update_user":
			$query = "update $table_users set $name='$value' where id=$id";
			break;
		default:
	}

	// execute query (for delete category, OK to delete all categories found)
	if (isset($query)) {
		try {
			if ($action == "delete_cat") {
				$result = mysqli_multi_query($db, $query) or die("Query failed: " . mysqli_error($db));
			} else {
				$result = mysqli_query($db, $query) or die("Query failed: " . mysqli_error($db));
			}
			$success = true;
			$message = "Invalid query";
		} catch (Exception $e) {
			$success = false;
		}
	} else {
		$success = false;
	}

	// return success data as JSON
	$JSON = json_encode(array(
		"success" => $success,
		"message" => $message,		
		"reload" => $reload
	));

	header('Content-Type: application/json');
	echo $JSON;
?>