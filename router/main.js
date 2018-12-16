var mysql = require('mysql'); // 선언

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'hyojin',
    password: 'Bluesky@007',
    port: 3306,
    database: 'pj2_db'
});

connection.connect(); // MySQL에 연결하기

module.exports = function (app) {
    // Main
    app.get('/', function (req, res) {
        res.sendfile("main.html");
    });

    // push manager mode in Main.html
    app.get('/login', function (req, res) {
        res.sendfile("login.html");
    });

    // Login as manager or subagency
    app.post('/login', function (req, res) {
        console.log(req.body);
        id = req.body.id;
        pwd = req.body.pwd;
        connection.query('select * from Sub_agency where (sa_code, sa_password) = (?, ?)', [id, pwd], function (err, rows) {
            if (err) throw err;
            if (rows.length != 0) {
                res.sendfile("order.html");
            }
            else {
                connection.query('select * from Administrator where (a_id, a_password) = (?, ?)', [id, pwd], function (err, rows) {
                    if (err) throw err;
                    if (rows.length != 0) {
                        res.sendfile("manager.html");
                    }
                    else {
                        res.sendfile("error.html");
                    }
                });
            }
        });
    });

    // when push agency_insert in manager.html
    app.get('/agency_insert', function (req, res) {
        res.sendfile("insert.html");
    });

    // when push agency_delete in manager.html
    app.get('/agency_delete', function (req, res) {
        res.sendfile("delete.html");
    });

    // find nation with sa_code
    function findNation(str) {
        var token = str.substring(0, 2);
        if (token == 'kr') {
            return 'korea';
        }
        else if (token == 'am') {
            return 'america';
        }
        else if (token == 'ca') {
            return 'canada';
        }
        else if (token == 'fr') {
            return 'france';
        }
        else {
            return 'defalut';
        }
    }

    // insert sub_agency
    app.post('/agency_insert', function (req, res) {
        console.log(req.body)
        sa_code = req.body.sa_code;
        sa_pwd = req.body.sa_pwd;
        sa_address = req.body.sa_address;
        sa_salary = req.body.sa_salary;
        sa_nation = findNation(sa_code);
        connection.query('insert into sub_agency(sa_code, sa_salary, sa_nation, sa_address, sa_password, h_name) values(?, ?, ?, ?, ?, ?)', [sa_code, sa_salary, sa_nation, sa_address, sa_pwd, 'head'], function (err, rows) {
            if (err) throw err;
            else {
                res.send("Insert success");
            }
        });
    });

    // delete sub_agency
    app.post('/agency_delete', function (req, res) {
        console.log(req.body);
        sa_code = req.body.sa_code;
        connection.query('delete from sub_agency where sa_code = (?)', [sa_code], function (err, rows) {
            if (err) throw err;
            else {
                res.send("Delete success");
            }
        });
    });

    // when push nation button in Manager.html
    app.get('/nation', function (req, res) {
        res.sendfile("nation.html");
    });

    // when select check box in nation.html -> show current inventory in checked nation
    app.post('/search_nation.api', function (req, res) {
        console.log(req.body);
        var selected = [];
        if (req.body.Korea != null) {
            korea = req.body.Korea;
            selected.push('"korea"');
        }

        if (req.body.America != null) {
            america = req.body.America;
            selected.push('"america"');
        }

        if (req.body.France != null) {
            france = req.body.France;
            selected.push('"france"');
        }

        if (req.body.Canada != null) {
            canada = req.body.Canada;
            selected.push('"canada"');
        }
        nation = connection.query('select * from Nation where n_id in (' + selected.join(',') + ')', function (err, rows1) {
            if (err) throw err;
            factory = connection.query('select * from Factory_orderlist where f_nation in (' + selected.join(',') + ')', function (err, rows2) {
                console.log(rows1);
                console.log(rows2);
                res.send({ nation: rows1, factory: rows2 });
            });
        });
    });

    // when pushed orderlist button in Manager.html
    app.get('/order_list', function (req, res) {
        connection.query('select orderlist_id, osa_code, order_model1, order_model2, order_model3, order_model4 from order_list', function (err, rows) {
            if (err) throw err;
            console.log(rows);
            res.render('index', {orderlist : rows });
        });
    });

    // for app.post('/order')
    function n_updateInvent(curInvent, demand) {
        if (curInvent > demand){
            return [(curInvent - demand), 0];
        }
        else {
            return [(curInvent - demand + 100), 1];
        }
    }

    // for app.post('/order')
    function f_updateInvent(curInvent, token) {
        if (token == 1) {
            return curInvent + 100;
        }
        else {
            return curInvent;
        }
    }

    // when sub_agency push order button -> nation, factory_orderlist db  automatically updated.
    app.post('/order', function (req, res) {

        console.log(req.body);
        var sa_code = req.body.sa_code;
        var model1 = parseInt(req.body.model1_number);
        var model2 = parseInt(req.body.model2_number);
        var model3 = parseInt(req.body.model3_number);
        var model4 = parseInt(req.body.model4_number);
        var sa_nation = findNation(sa_code);

        connection.query('insert into order_list(osa_code, order_model1, order_model2, order_model3, order_model4, h_name) VALUES (?, ?, ?, ?, ?, ?)', [sa_code, model1, model2, model3, model4, 'head'], function (err, rows) {
            if (err) { //error condition, more than 100
                console.log('err occur');
                res.send({ response: 'the number should be less than 100\n request failed' });
            }

            else{
                connection.query('select * from nation where n_id = (?)', [sa_nation], function (err, rows) {
                    if (err) throw err;
                    var ninvent1 = parseInt(rows[0].n_carmodel1);
                    var ninvent2 = parseInt(rows[0].n_carmodel2);
                    var ninvent3 = parseInt(rows[0].n_carmodel3);
                    var ninvent4 = parseInt(rows[0].n_carmodel4);

                    var first = n_updateInvent(ninvent1, model1);
                    var nnewInvent1 = first[0];
                    var tofac1 = first[1];

                    var second = n_updateInvent(ninvent2, model2);
                    var nnewInvent2 = second[0];
                    var tofac2 = second[1];

                    var third = n_updateInvent(ninvent3, model3);
                    var nnewInvent3 = third[0];
                    var tofac3 = third[1];

                    var fourth = n_updateInvent(ninvent4, model4);
                    var nnewInvent4 = fourth[0];
                    var tofac4 = fourth[1];

                    connection.query('update nation set n_carmodel1 = (?), n_carmodel2 = (?), n_carmodel3 = (?), n_carmodel4 = (?) where n_id = (?)', [nnewInvent1, nnewInvent2, nnewInvent3, nnewInvent4, sa_nation], function (err, rows) {
                        if (err) throw err;
                    });

                    connection.query('select * from factory_orderlist where f_nation = (?)', [sa_nation], function (req, rows) {
                        var finvent1 = parseInt(rows[0].f_carmodel1);
                        var finvent2 = parseInt(rows[0].f_carmodel2);
                        var finvent3 = parseInt(rows[0].f_carmodel3);
                        var finvent4 = parseInt(rows[0].f_carmodel4);
                        var fnewInvent1 = f_updateInvent(finvent1, tofac1);
                        var fnewInvent2 = f_updateInvent(finvent2, tofac2);
                        var fnewInvent3 = f_updateInvent(finvent3, tofac3);
                        var fnewInvent4 = f_updateInvent(finvent4, tofac4);
                        connection.query('update factory_orderlist set f_carmodel1 = (?), f_carmodel2 = (?), f_carmodel3 = (?), f_carmodel4 = (?) where f_nation = (?)', [fnewInvent1, fnewInvent2, fnewInvent3, fnewInvent4, sa_nation], function (err, rows) {
                            if (err) throw err;
                            else {
                                res.send({ response: "updated nation, factory_orderlist databases" });
                            }
                        });
                    });
                });
            }
        });

    });

    function getNationInvent(n_id) {
        return new Promise(function (resolve, reject) {
            result = [];
            connection.query('select * from nation where n_id = (?)', [n_id], function (err, rows) {
                if (err) throw err;
                else {
                    var ninvent1 = parseInt(rows[0].n_carmodel1);
                    var ninvent2 = parseInt(rows[0].n_carmodel2);
                    var ninvent3 = parseInt(rows[0].n_carmodel3);
                    var ninvent4 = parseInt(rows[0].n_carmodel4);
                    result.push(ninvent1);
                    result.push(ninvent2);
                    result.push(ninvent3);
                    result.push(ninvent4);
                    resolve(result);
                }
            });
        });
    };

    function getMax1(nation) {
        return new Promise(function (resolve, reject) {
            connection.query('select max(sum1) as msum1 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?)', [nation], function (err, rows) {
                if (err) throw err;
                else {
                    console.log(rows);
                    var result = rows[0].msum1;
                    resolve(result);
                }
            });
        });
    }

    function getMax2(nation) {
        return new Promise(function (resolve, reject) {
            connection.query('select max(sum2) as msum2 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?)', [nation], function (err, rows) {
                if (err) throw err;
                else {
                    console.log(rows);
                    var result = rows[0].msum2;
                    resolve(result);
                }
            });
        });
    }

    function getMax3(nation) {
        return new Promise(function (resolve, reject) {
            connection.query('select max(sum3) as msum3 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?)', [nation], function (err, rows) {
                if (err) throw err;
                else {
                    console.log(rows);
                    var result = rows[0].msum3;
                    resolve(result);
                }
            });
        });
    }

    function getMax4(nation) {
        return new Promise(function (resolve, reject) {
            connection.query('select max(sum4) as msum4 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?)', [nation], function (err, rows) {
                if (err) throw err;
                else {
                    console.log(rows);
                    var result = rows[0].msum4;
                    resolve(result);
                }
            });
        });
    }

    // finding subagency sold most
    app.post('/most_sell', function (req, res) {
        console.log(req.body);
        // find checked nation
        var nation;
        if (req.body.Korea != null) {
            nation = 'Korea';
        } else if (req.body.America != null) {
            nation = 'America';
        } else if (req.body.France != null) {
            nation = 'France';
        } else if (req.body.Canada != null) {
            nation = 'Canada';
        }
        // make a query
        getMax1(nation).then(function (data) {
            console.log(data);
            connection.query('select sa_nation, sa_code, sum1 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?) and sum1 = (?)', [nation, data], function (err, rows1) {
                getMax2(nation).then(function (data2) {
                    connection.query('select sa_nation, sa_code, sum2 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?) and sum2 = (?)', [nation, data2], function (err, rows2) {
                        getMax3(nation).then(function (data3) {
                            connection.query('select sa_nation, sa_code, sum3 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?) and sum3 = (?)', [nation, data3], function (err, rows3) {
                                getMax4(nation).then(function (data4) {
                                    connection.query('select sa_nation, sa_code, sum4 from sum_order join sub_agency on osa_code = sa_code where sa_nation = (?) and sum4 = (?)', [nation, data4], function (err, rows4) {
                                        res.send({
                                            sonata: rows1,
                                            granger: rows2,
                                            i40: rows3,
                                            avante: rows4
                                        });

                                    });
                                });

                            });
                        });

                    });
                });
            });
        });

    });

    // when pushed salary button in Manager.html
    app.get('/salary', function (req, res) {
        res.sendfile("salary.html");
    });

    // search sub_agency with more salary compared to each nation's highest salary
    app.post('/search_salary', function (req, res) {
        console.log(req.body);
        var nation;
        if (req.body.Korea != null) {
            nation = 'korea';
        }
        else if (req.body.America != null) {
            nation = 'america';
        }

        else if (req.body.France != null) {
            nation = 'france';
        }

        else if (req.body.Canada != null) {
            nation = 'canada';
        }
        console.log(nation);
        connection.query('select sa_code, sa_salary, sa_nation from sub_agency where sa_salary > (select MAX(sa_salary) from sub_agency where sa_nation = (?))', [nation], function (err, rows) {
            if (err) throw err;
            console.log(rows);
            res.send({salary_list : rows});
        });
    });
    
}



