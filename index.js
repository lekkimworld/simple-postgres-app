const express = require("express");
const {Pool} = require("pg");
const exphbs = require("express-handlebars")
const path = require("path");
require("dotenv").config();

const pool = new Pool({
    'connectionString': process.env.DATABASE_URL,
    'ssl': process.env.NODE_ENV === 'production' ? true : false
});

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.engine("handlebars", exphbs({"defaultLayout": "main"}));
app.set("view engine", "handlebars");

app.get("/", (req, res) => {
    pool.query("select count from counter").catch(err => {
        // create table
        return pool.query("create table counter (count integer not null default 0)")

    }).then(() => {
        return pool.query("select count from counter");

    }).then(result =>{
        let counter;
        let p;
        if (result.rowCount === 0) {
            counter = 1;
            p = pool.query("insert into counter (count) values (1)");
        } else {
            counter = result.rows[0].count;
            counter++;
            p = pool.query("update counter set count=$1", [counter]);
        }
        return Promise.all([p, Promise.resolve(counter)]);
    }).then((data) => {
        res.render("root", {
            "counter": data[1]
        });
    })
})
app.listen(process.env.PORT || 8080);
