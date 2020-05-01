const express = require("express");
const exphbs = require("express-handlebars")
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.engine("handlebars", exphbs({"defaultLayout": "main"}));
app.set("view engine", "handlebars");

if (process.env.DEBUG_APP_LOAD) {
    app.get("/", (req, res) => {
        res.type("text").send(`App loaded with the following environment variables: ${Object.keys(process.env).reduce((prev, key) => {
            return `${prev}\n${key} = ${process.env[key]}`
        }, "")}`);
    })
} else {
    const pg = require("pg");
    const pool = (function() {
        if (process.env.DATABASE_URL.indexOf("host=") !== -1) {
            // parse
            console.log(`host= found in DATABASE_URL - parsing`);
            const config = process.env.DATABASE_URL.split(" ").reduce((prev, e) => {
                const elems = e.split("=");
                prev[elems[0]] = elems[1];
                return prev;
            }, {});
            if (config.sslmode === "require") config.ssl = true;
            if (config.dbname) config.database = config.dbname;
            console.log(`Produced config: ${JSON.stringify(config)}`);
            return new pg.Pool(config);
        } else {
            // use as-is
            console.log(`Using DATABASE_URL as-is`);
            return new pg.Pool({
                'connectionString': process.env.DATABASE_URL,
                'ssl': process.env.DATABASE_SSL ? true : false
            });
        }
    })();



    app.get("/", (req, res) => {
        pool.query("select count from counter").catch(err => {
            // create table
            return pool.query("create table counter (count integer not null default 0)")

        }).then(() => {
            return pool.query("select count from counter");

        }).then(result => {
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
        }).catch(err => {
            res.type("text").send(`Oops! Something went wrong!\n${err.message}`);
        })
    })
}

// listen
app.listen(process.env.PORT || 8080);
