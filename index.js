const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();

const url = 'mongodb://localhost:27017';
const dbName = 'indegene';


//http://localhost:3000/api/authors?n=2
//http://localhost:3000/api/authors?y=2000
app.get('/api/authors', (req, res) => {
    const n = parseInt(req.query.n);
    const y = parseInt(req.query.y);

    if (n == NaN && y == NaN) return res.status(400).send("Please provide n or y.");

    if (n >= 0)
        getAuthorsByNumber(n, res);
    else
        getAuthorsByYear(y, res);
});

//http://localhost:3000/api/totals
app.get('/api/totals', (req, res) => {
    getTotalsByAithor(res);
});

//http://localhost:3000/api/find?birthDate=1906-12-09T05:00:00.000Z&totalPrice=7000
app.get('/api/find', (req, res) => {
    const birthDate = req.query.birthDate || "0001-01-01T00:00:00.000Z";
    const totalPrice = parseInt(req.query.totalPrice) || 0;

    findAuthors(res, birthDate, totalPrice);
});

function getAuthorsByNumber(n, res) {

    MongoClient.connect(url, function(err, client) {
        if (err) throw err;
        const db = client.db(dbName);
        const collection = db.collection('authors');
        collection.aggregate(
            [{
                    $lookup: {
                        from: 'awards',
                        localField: 'code',
                        foreignField: 'author',
                        as: 'authorAwards'
                    }
                },
                {
                    $project: {
                        name: "$name",
                        code: "$code",
                        numOfAwards: { $size: "$authorAwards" }
                    }
                },
                {
                    $match: {
                        numOfAwards: {
                            $gte: n
                        }
                    }
                }
            ]).toArray((err, items) => {
            res.send(items);
            client.close();
        });
    });
}

function getAuthorsByYear(y, res) {

    MongoClient.connect(url, function(err, client) {
        if (err) throw err;
        const db = client.db(dbName);
        const collection = db.collection('authors');
        collection.aggregate(
            [{
                    $lookup: {
                        from: "awards",
                        let: { author: "$code", year: y },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$author", "$$author"] },
                                        { $gte: ["$year", "$$year"] }
                                    ]
                                }
                            }
                        }],
                        as: "authorAwards"
                    }
                },
                {
                    $project: {
                        name: "$name",
                        code: "$code",
                        numOfAwards: { $size: "$authorAwards" },
                        years: "$authorAwards.year"
                    }
                },
                {
                    $match: {
                        numOfAwards: {
                            $gt: 0
                        }
                    }
                }
            ]).toArray((err, items) => {
            res.send(items);
            client.close();
        });
    });
}

function getTotalsByAithor(res) {
    MongoClient.connect(url, function(err, client) {
        if (err) throw err;
        const db = client.db(dbName);
        const collection = db.collection('solds');
        collection.aggregate(
            [{
                $group: {
                    _id: "$author",
                    totalBooksSold: {
                        $sum: "$qty"
                    },
                    totalProfit: {
                        $sum: { $multiply: ["$qty", "$price"] }
                    }
                }
            }]).toArray((err, items) => {
            res.send(items);
            client.close();
        });
    });
}

function findAuthors(res, dob, total) {
    dob = new Date(dob);
    MongoClient.connect(url, function(err, client) {
        if (err) throw err;
        const db = client.db(dbName);
        const collection = db.collection('authors');
        collection.aggregate(
            [{
                    $lookup: {
                        from: 'solds',
                        // localField: 'code',
                        // foreignField: 'author',
                        let: { author: "$code" },
                        pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ["$author", "$$author"]
                                    }
                                }
                            },
                            {
                                $project: { _id: 0, amount: { $multiply: ["$qty", "$price"] } }
                            }
                        ],
                        as: 'authorSolds'
                    }
                },
                {
                    $project: {
                        name: "$name",
                        code: "$code",
                        birthDate: "$dob",
                        solds: "$authorSolds",
                        totalPrice: {
                            $sum: "$authorSolds.amount"
                        }
                    }
                },
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $gte: ["$birthDate", dob] },
                                { $gte: ["$totalPrice", total] }
                            ]
                        }
                    }
                }
            ]).toArray((err, items) => {
            res.send(items);
            client.close();
        });
    });
}

const port = process.env.PORT || 3000;
app.listen(port, () => { console.log(`Listening to port ${port}...`) });