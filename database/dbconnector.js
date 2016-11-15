var mysql = require('mysql');

var storeDbConnection;

const DB_ERR_SUCCESS = 0;
const DB_ERR_DUPLICATE = 1;
const DB_ERR_CONNECTION = 2;

var DbModule = function (callback) {
	storeDbConnection = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: 'admin',
		database: 'store_items'
	});

	storeDbConnection.connect(function (err) {
		if (err) {
			callback(err.stack);
		}
	});
	callback("Connection to DB Server is sucessful");
};

DbModule.prototype.addNewItem = function (item, callback) {
	if (storeDbConnection.threadId != undefined) {
		storeDbConnection.query('INSERT INTO all_items SET ?', item, function (err, response) {
			if (err) {
				if (err.code === 'ER_DUP_ENTRY') {
					callback(DB_ERR_DUPLICATE);
				}
			} else {
				callback(DB_ERR_SUCCESS);
			}
		});
	} else {
		callback(DB_ERR_CONNECTION);
	}
};

DbModule.prototype.registerUser = function (user, callback) {
	if (storeDbConnection.threadId != undefined) {
		user.customer_id = createCustomerId(user.firstname, user.mobile_number);
		storeDbConnection.query('INSERT INTO all_users SET ?', user, function (err, response) {
			if (err) {
				console.log(err);
				if (err.code === 'ER_DUP_ENTRY') {
					callback(DB_ERR_DUPLICATE, null);
				}
			} else {
				callback(DB_ERR_SUCCESS, user.customer_id);
			}
		});
	} else {
		callback(DB_ERR_CONNECTION, null);
	}
};

DbModule.prototype.registerVendor = function (user, callback) {
	if (storeDbConnection.threadId != undefined) {
		var vendor = {};
		vendor.vendor_id = createCustomerId(user.firstname, user.mobile_number);
		vendor.vendor_name = user.firstname;
		vendor.vendor_mobile = user.mobile_number;
		vendor.vendor_email = user.email;

		storeDbConnection.query('INSERT INTO vendor_info SET ?', vendor, function (err, response) {
			if (err) {
				console.log(err);
				if (err.code === 'ER_DUP_ENTRY') {
					callback(DB_ERR_DUPLICATE, null);
				}
			} else {
				callback(DB_ERR_SUCCESS, user.vendor_id);
			}
		});
	} else {
		callback(DB_ERR_CONNECTION, null);
	}
};

DbModule.prototype.getAllStoreItems = function (error, callback) {
	if (storeDbConnection.threadId != undefined) {
		storeDbConnection.query('SELECT * FROM all_items', function (err, records) {
			if (err)
				error(err);

			callback(records);
		});
	} else {
		callback(DB_ERR_CONNECTION);
	}
};

DbModule.prototype.getAllQuotations = function (error, callback) {
	if (storeDbConnection.threadId != undefined) {
		storeDbConnection.query('SELECT * FROM quotations', function (err, records) {
			if (err)
				error(err);

			callback(records);
		});
	} else {
		callback(DB_ERR_CONNECTION);
	}
};

DbModule.prototype.authenticateUser = function (credentials, callback) {
	if (storeDbConnection.threadId != undefined) {
		storeDbConnection.query('SELECT * FROM all_users WHERE customer_id = ?',
			credentials.customer_id,
			function (err, records) {
				if (err)
					callback(err, null);

				callback(null, records);
			});
	} else {
		callback(DB_ERR_CONNECTION, null);
	}
}

DbModule.prototype.authenticateVendor = function (credentials, callback) {
	if (storeDbConnection.threadId != undefined) {
		storeDbConnection.query('SELECT * FROM vendor_info WHERE vendor_id = ?',
			credentials.vendorId,
			function (err, records) {
				if (err)
					callback(err, null);

				callback(null, records);
			});
	} else {
		callback(DB_ERR_CONNECTION, null);
	}
}


DbModule.prototype.addToStock = function (item, callback) {
	if (storeDbConnection.threadId != undefined) {
		var availableStock = 0;
		storeDbConnection.query('SELECT * FROM all_items WHERE item_id = ?',
			item.itemId,
			function (err, records) {
				if (err) {
					callback(err);
				} else {
					availableStock = parseInt(records[0].quantity);

					availableStock = availableStock + parseInt(item.quantity);

					console.log(availableStock);

					storeDbConnection
						.query('UPDATE all_items SET quantity = ? WHERE item_id = ?', [availableStock, item.itemId],
							function (err, records) {
								if (err)
									callback(err);

								callback(DB_ERR_SUCCESS);
							});
				}
			});
	} else {
		callback(DB_ERR_CONNECTION);
	}
}

DbModule.prototype.newShoppingRequest = function (shRequest, callback) {
	if (storeDbConnection.threadId != undefined) {
		var shoppingReq = {};
		shoppingReq.request_id = createRequestId(shRequest.customer_id);
		console.log(shoppingReq.request_id);

		shoppingReq.customer_id = shRequest.customer_id;
		shoppingReq.items = JSON.stringify(shRequest.items);

		storeDbConnection.query('INSERT INTO quotations SET ?', shoppingReq, function (err, response) {
			if (err) {
				console.log(err);
				callback(err, null);
			} else {
				callback(DB_ERR_SUCCESS, shoppingReq.request_id);
			}
		});
	} else {
		callback(DB_ERR_CONNECTION, null);
	}
}


function createRequestId(customerId) {
	return "" + Math.round(new Date().getTime() / 1000);
}

function createCustomerId(firstname, mobileNumber) {
	return firstname.substring(0, 4) + mobileNumber.substring(0, 4);
}



module.exports = DbModule;
