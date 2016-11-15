var express = require('express'),
	http = require('http'),
	https = require('https'),
	fileSystem = require('fs'),
	request = require("request"),
	DbModule = require('./database/dbconnector.js');

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var bodyParser = require('body-parser');

var app = express();
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));

app.listen(4004, function () {
	console.log('Server running http://localhost:4004');
});

var dbModule = new DbModule(function (statusMsg) {
	console.log(statusMsg);
});

app.post('/customer/register', function (req, res) {
	res.statusCode = 400;

	if (!req.body.mobile_number || !req.body.firstname || !req.body.email) {
		return res.send("Parameters missing.");
	}

	dbModule.registerUser(req.body, function (statusCode, customerId) {
		if (statusCode == 0) {
			res.statusCode = 200;
			return res.send({
				"customer_id": customerId,
				"password": customerId
			});
		} else if (statusCode == 1) {
			return res.send("DUPLICATE");
		} else {
			return res.send("Unable to insert data.");
		}
	});
});

app.post('/vendor/register', function (req, res) {
	res.statusCode = 400;

	if (!req.body.mobile_number || !req.body.firstname || !req.body.email) {
		return res.send("Parameters missing.");
	}

	dbModule.registerVendor(req.body, function (statusCode, customerId) {
		if (statusCode == 0) {
			res.statusCode = 200;
			return res.send({
				"vendor_id": customerId,
				"password": customerId
			});
		} else if (statusCode == 1) {
			return res.send("DUPLICATE");
		} else {
			return res.send("Unable to insert data.");
		}
	});

});

// Login Module 
app.post('/customer/login', function (req, res) {
	console.log(req.body);

	if (!req.body.customer_id || !req.body.customer_pin) {
		res.statusCode = 400;
		return res.send("Parameters missing.");
	}
	dbModule.authenticateUser(req.body, function (error, response) {
		if (error) {
			console.log(error);

			res.statusCode = 400;
			return res.send("User not found.");
		}

		console.log(response);

		res.statusCode = 200;
		return res.send("User authenticated.");
	});
});

app.post('/vendor/login', function (req, res) {
	if (!req.body.vendorId || !req.body.vendorPin) {
		res.statusCode = 400;
		return res.send({
			"status": "error",
			"message": "Parameters missing."
		});
	}

	dbModule.authenticateVendor(req.body, function (error, response) {
		if (error) {
			res.statusCode = 400;
			return res.send("Vendor NOT found.");
		}
		res.statusCode = 200;
		return res.send("Vendor authenticated.");
	});
});

app.post('/vendor/createItem', multipartMiddleware, function (req, res) {

	res.statusCode = 400;

	if (!req.body.item_id || !req.body.item_name || !req.body.item_price) {
		return res.send("Parameters missing.");
	}

	var item = req.body;

	if (req.files && req.files.thumbnail) {
		if (req.files.thumbnail.size > (5 * 1024)) {
			return res.send("File size cannot exceed 5KB");
		}

		var newPath = "./thumbnails/category/" + item.item_id + ".jpg";

		item.thumnail = newPath;
		// If a thumbnail has been added
		fileSystem.readFile(req.files.thumbnail.path, function (err, data) {
			fileSystem.writeFile(newPath, data, function (err) {
				console.log("File copied");
			});
		});
	}

	dbModule.addNewItem(item, function (statusCode) {
		if (statusCode == 0) {
			res.statusCode = 200;
			return res.send("Data inserted successfully.");
		} else if (statusCode == 1) {
			return res.send("DUPLICATE");
		} else {
			return res.send("Unable to insert data.");
		}
	});
});

app.get('/store/list_items', function (req, res) {
	dbModule.getAllStoreItems(function error() {
		res.statusCode = 400;
		return res.send("Unable to get data.");
	}, function success(records) {
		res.statusCode = 200;
		return res.send(records);
	});
});

app.post('/vendor/store/addStock', function (req, res) {
	if (!req.body.itemId || !req.body.quantity) {
		res.statusCode = 400;
		return res.send("Parameters missing.");
	}

	dbModule.addToStock(req.body, function (statusCode) {
		if (statusCode == 0) {
			res.statusCode = 200;
			return res.send("Item added.");
		} else if (statusCode == 1) {
			return res.send("DUPLICATE");
		} else {
			return res.send("Unable to insert data.");
		}
	});
});

app.delete('/vendor/store/removeStock', function (req, res) {
	if (!req.body.itemId || !req.body.quantity) {
		res.statusCode = 400;
		return res.send("Parameters missing.");
	}

	res.statusCode = 200;
	return res.send("success");
});

app.get('/vendor/store/getAllQuotations', function (req, res) {
	dbModule.getAllQuotations(function error() {
		res.statusCode = 400;
		return res.send("Unable to get data.");
	}, function success(records) {
		res.statusCode = 200;
		for (var index = 0; index < records.length; ++index) {
			var contact = JSON.parse(records[index].items);
			records[index].items = contact;
		}
		return res.send(records);
	});
});

app.post('/customer/newQuotation', function (req, res) {
	if (!req.body.quotation.customer_id || !req.body.quotation.customer_pin) {
		res.statusCode = 400;
		return res.send("Parameters missing.");
	}
	dbModule.newShoppingRequest(req.body.quotation, function (error, response) {
		if (error) {
			res.statusCode = 400;
			return res.send("User not found.");
		}
		res.statusCode = 200;
		return res.send("RI" + response);
	});
});
