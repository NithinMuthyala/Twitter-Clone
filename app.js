const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
let db;
const app = express();

app.use(express.json());
const dbpath = path.join(__dirname, "twitterClone.db");
const initilaize = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running........");
    });
  } catch (e) {
    console.log(e.message);
  }
};

initilaize();

app.post("/register/", async (request, response) => {
  //console.log(request.body);
  const { username, password, name, gender } = request.body;
  //console.log(request.body);
  const userexistsquery = `select username from user where username = "${username}"`;
  const dbresponse = await db.get(userexistsquery);
  //console.log(dbresponse)
  if (dbresponse !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userquery = `insert into user
(name,username,password,gender)
values("${name}","${username}","${hashedPassword}","${gender}")`;
      const dbresponse = await db.run(userquery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

//api2 login user
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  console.log(request.body);
  const userexitsquery = `select * from user where username = "${username}"`;
  const dbresponse = await db.get(userexitsquery);
  console.log(dbresponse);
  console.log(dbresponse.username);
  if (dbresponse.username === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPassword = await bcrypt.compare(password, dbresponse.password);
    console.log(isPassword);
    if (isPassword) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "nithin");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const autentication = (request, response, next) => {
  let jwtToken;
  const authheader = request.headers["authorization"];
  console.log(authheader);
  if (authheader === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = authheader.split(" ")[1];
    jwt.verify(jwtToken, "nithin", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//api3
app.get("/user/tweets/feed/", autentication, async (request, response) => {
  const { username } = request;
  // console.log(username);

  const useridquery = `select user_id from user where username = "${username}"`;
  const getuserid = await db.get(useridquery);
  // console.log(getuserid);

  const getfollowerid = `select following_user_id from follower
where follower_user_id = ${getuserid.user_id}`;
  const foolowinguserids = await db.all(getfollowerid);
  // console.log(foolowinguserids);
  const followingid = foolowinguserids.map((eachobj) => {
    return eachobj.following_user_id;
  });
  // console.log(followingid);
  const gettweetsqueery = `select user.username,tweet.tweet,tweet.date_time as dateTime
from user inner join tweet on user.user_id = tweet.user_id
where user.user_id in (${followingid})order by tweet.date_time DESC limit 4 ;`;
  const dbrrespone = await db.all(gettweetsqueery);
  response.send(dbrrespone);
  console.log(dbrrespone);
});

//api4 list of names the user follows
app.get("/user/following/", autentication, async (request, response) => {
  const { username } = request;
  const useridquery = `select user_id from user where username = "${username}";`;
  const dbuserid = await db.get(useridquery);
  // console.log(dbuserid);
  const followingquery = `select following_user_id from
follower
where follower_id = ${dbuserid.user_id} `;
  const followingids = await db.all(followingquery);
  // console.log(followingids);
  const followingidsarray = followingids.map((eachobj) => {
    return eachobj.following_user_id;
  });
  // console.log(followingidsarray);
  const getfollowers = `select name from user where user_id in (${followingidsarray});`;
  const dbresponse = await db.all(getfollowers);
  response.send(dbresponse);
  // console.log(dbresponse);
});
//api5 people who follow user

app.get("/user/followers/", autentication, async (request, response) => {
  const { username } = request;
  const useridquery = `select user_id from user where username = "${username}";`;
  const dbuserid = await db.get(useridquery);
  // console.log(dbuserid);
  const userfollwerquery = `select follower_user_id from follower
where following_user_id = ${dbuserid.user_id}`;
  const followers = await db.all(userfollwerquery);
  const followersArray = followers.map((eachobj) => {
    return eachobj.follower_user_id;
  });
  //console.log(followersArray);
  const getfollowernames = `select name from user where user_id in (${followersArray})`;
  const followernames = await db.all(getfollowernames);
  //console.log(followernames);
  response.send(followernames);
});

//api6
app.get("/tweets/:tweetId/", autentication, async (request, response) => {
  const { username } = request;
  const { tweetId } = request.params;
  const useridquery = `select user_id from user where username = "${username}";`;
  const userid = await db.get(useridquery);
  // console.log(userid);

  const userfollowingquery = `select follower_user_id from follower where
following_user_id = ${userid.user_id}`;
  const follwerids = await db.all(userfollowingquery);

  const followeridsArray = follwerids.map((eachobj) => {
    return eachobj.follower_user_id;
  });
  // console.log(followeridsArray);
  const tweetidsquery = `select tweet_id from tweet where user_id in (${followeridsArray});`;
  const tweetids = await db.all(tweetidsquery);
  // console.log(tweetids);
  const twitteridArray = tweetids.map((eachobj) => {
    return eachobj.tweet_id;
  });
  // console.log(twitteridArray);
  if (twitteridArray.includes(parseInt(tweetId))) {
    const likescount = ` select count(like_id) as likes from like where tweet_id = ${tweetId}`;
    const likesobj = await db.get(likescount);
    const replycountqueery = `select count(reply_id) as replies from reply
where tweet_id = ${tweetId}`;
    const replyobj = await db.get(replycountqueery);
    const tweetanddatequery = `select tweet,date_time from tweet where tweet_id = ${tweetId}`;
    const tweetobj = await db.get(tweetanddatequery);
    // console.log(replyobj);
    // console.log(likesobj);
    // console.log(tweetobj);
    const returnobj = {
      tweet: tweetobj.tweet,
      likes: likesobj.likes,
      replies: replyobj.replies,
      dateTime: tweetobj.date_time,
    };
    response.send(returnobj);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

//api7
app.get("/tweets/:tweetId/likes/", autentication, async (request, response) => {
  const { tweetId } = request.params;
  const { username } = request;
  const usernamequery = `select user_id from user where username = "${username}";`;
  const userid = await db.get(usernamequery);
  console.log(userid);
  const user = userid.user_id;
  const userfollowingquery = `select following_user_id from follower where
follower_user_id = ${user}`;

  const userfollowers = await db.all(userfollowingquery);
  //console.log(userfollowers);
  const userfollowingArray = userfollowers.map((eachobj) => {
    return eachobj.following_user_id;
  });
  const tweetidquery = `select tweet_id from tweet where user_id in (${userfollowingArray})`;
  const tweetobj = await db.all(tweetidquery);
  const tweetidarray = tweetobj.map((eachobj) => {
    return eachobj.tweet_id;
  });

  if (tweetidarray.includes(parseInt(tweetId))) {
    const query = `select user.username as likes from
user inner join like on user.user_id = like.user_id`;
    const dbresponse = await db.all(query);
    const likednames = dbresponse.map((eachobj) => {
      return eachobj.likes;
    });
    likednames.sort();
    const responseobj = { likes: likednames };
    response.send(responseobj);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

app.get(
  "/tweets/:tweetId/replies/",
  autentication,
  async (request, response) => {
    const { tweetId } = request.params;
    const { username } = request;
    console.log(tweetId);
    console.log(username);

    const useridquery = `select user_id from user
where username = "${username}"`;
    const dbuserid = await db.get(useridquery);
    const userfollowingquery = `select following_user_id from follower
where follower_user_id = ${dbuserid.user_id}`;

    const followerids = await db.all(userfollowingquery);

    console.log(followerids);
    const followerArray = followerids.map((eachobj) => {
      return eachobj.following_user_id;
    });

    const tweetidquery = `select tweet_id from tweet where user_id in (${followerArray})`;
    const tweetobj = await db.all(tweetidquery);
    console.log(tweetobj);
    const tweetArray = tweetobj.map((eachobj) => {
      return eachobj.tweet_id;
    });

    console.log(tweetArray);
    if (tweetArray.includes(parseInt(tweetId))) {
      const replyquery = `select user.username as name ,reply.reply
from user inner join reply on user.user_id = reply.user_id`;
      const dbresponse = await db.all(replyquery);
      // console.log(dbresponse);
      const respbj = { replies: dbresponse };
      response.send(respbj);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//api9

app.get("/user/tweets/", autentication, async (request, response) => {
  let { username } = request;
  const getuserid = `select user_id from user where username = "${username}"`;
  const userid = await db.get(getuserid);
  const gettweetsquery = `select tweet from tweet where user_id = ${userid.user_id}`;
  const tweets = await db.all(gettweetsquery);
  response.send(tweets);
});

//api10

app.post("/user/tweets/", autentication, async (request, response) => {
  const { username } = request;
  const { tweet } = request.body;
  const userid = `select user_id from user where username = "${username}"`;
  const dbuser = await db.get(userid);
  const currentDate = new Date();
  const createTweetquery = `insert into tweet
(tweet,user_id,date_time)
values("${tweet}",${dbuser.user_id},"${currentDate}")`;
  const dbtweet = await db.run(createTweetquery);
  const tweet_id = dbtweet.lastID;
  response.send("Created a Tweet");
});

//api11

app.delete("/tweets/:tweetId/", autentication, async (request, response) => {
  const { username } = request;
  const { tweetId } = request.params;
  const useridquery = `select user_id from user where username = "${username}"`;
  const dbuserid = await db.get(useridquery);
  const gettweetquery = `select tweet_id from tweet where user_id = ${dbuserid.user_id}`;
  const tweetsobj = await db.all(gettweetquery);
  //console.log(tweetsobj);
  const tweetArray = tweetsobj.map((eachobj) => {
    return eachobj.tweet_id;
  });
  //console.log(tweetArray);
  if (tweetArray.includes(parseInt(tweetId))) {
    const deletequery = `delete from tweet where tweet_id = ${tweetId}`;
    const dbres = await db.run(deletequery);
    response.send("Tweet Removed");
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});
module.exports = app;
