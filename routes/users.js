var express = require("express");
var router = express.Router();
var Q_Database = require("../models/question");
var A_Database = require("../models/applicant");
var userService = require("../services/userService");
var userFunctions = require("../services/userFunctions");
var passport = require("passport");
const auth = require("../middleware/authentication");
const request = require("request-promise");
var date = new Date();

router.get("/", (req, res) => {
  res.render("index", { message: req.flash("message") || "" });
});

router.post(
  "/login",
  passport.authenticate("login", {
    successRedirect: "/user-role",
    failureRedirect: "/",
    failureFlash: true
  })
);

router.get("/register", (req, res) => {
  res.render("register", { message: "" });
});

// router.post("/register", async (req, res, next) => {
//   const options = {
//     method: "POST",
//     uri: "https://www.google.com/recaptcha/api/siteverify",
//     formData: {
//       secret: process.env.RECAPTCHA_SECRET,
//       response: req.body["g-recaptcha-response"]
//     }
//   };
//   request(options)
//     .then(response => {
//       let cResponse = JSON.parse(response);
//       if (!cResponse.success) {
//         res.render("register", { message: "Invalid Captcha" });
//       }
//       return userFunctions
//         .addUser(req.body)
//         .then(function(message) {
//           if (message === "ok") return res.redirect("/");
//           return res.render("register", { message: message });
//         })
//         .catch(err => {
//           console.log(err);
//           next(err);
//         });
//     })
//     .catch(err => next(err));
// });

router.post("/register", async (req, res, next) => {
  try {
    var message = await userFunctions.addUser(req.body);
    console.log("message :" + message)
    if (message === "ok") return res.redirect("/");
    return res.render("register", { message: message });
  } catch (error) {
    next(error)
  }
})

router.post("/addq", async (req, res, next) => {
  try {
    let newq = new Q_Database();
    newq.question = req.body.question;
    newq.answer = req.body.answer;
    let ss = [];
    ss.push(req.body.opt1);
    ss.push(req.body.opt2);
    ss.push(req.body.opt3);
    ss.push(req.body.opt4);
    newq.options = ss.map(hh => {
      return {
        stuff: hh,
      };
    });
    // newq.options[0] = req.body.opt1;
    // newq.options[1] = req.body.opt2;
    // newq.options[2] = req.body.opt3;
    // newq.options[3] = req.body.opt4;
    // newq.options = ss;
    newq.qDomain = req.body.domain;
    await newq.save();
    res.json("success")
  } catch (error) {
    next(error)
  }
})

router.get("/user-role", auth.isLoggedIn, (req, res, next) => {
  try {
    console.log("entered user-role");

    if (req.user.role === "admin") {
      return res.redirect("/admin");
    }
    res.redirect("/instructions");
  } catch (error) {
    next(error);
  }
});

// router.get("/data/:idd", async (req, res, next) => {
//   try {
//     var idd = req.path;
//     idd = idd.split("/");
//     idd = idd[2];
//     var data = await A_Database.find(
//       { regno: idd },
//       "regno response status overSmart"
//     ).populate("response.questionId", "question qDomain answer");
//     res.json(data);
//   } catch (error) {
//     next(error);
//   }
// });

router.get("/logout", auth.isLoggedIn, (req, res) => {
  req.logout();
  res.redirect("/");
});
router.get("/thanks", auth.isUser, async (req, res, next) => {
  try {
    let datas = await A_Database.find(
      { _id: req.user.id },
      "response"
    ).populate("response.questionId", "question qDomain answer");
    let marks = 0;
    // console.log(datas[0])
    let data = datas[0]["response"];
    let news = data.map(ee => {
      return {
        ans: ee.questionId.answer,
        suba: ee.userSolution
      }
    })
    news.forEach(ee => {
      if (ee.ans == ee.suba) {
        marks++;
      }
    })
    console.log(marks);
    // res.json(news);
    // req.logout();
    res.render("thanks", { data: marks });
  } catch (error) {
    next(error)
  }

});

router.get(
  "/instructions",
  auth.isUser,
  auth.isAttempt,
  async (req, res, next) => {
    res.render("instructions", { user: req.user });
  }
);

router.post("/domain", auth.isUser, auth.isAttempt, async (req, res, next) => {
  try {
    var startTime = Date.now();
    var domain = req.body.domain;
    var maxTime = domain.length * 600;
    await A_Database.findByIdAndUpdate(req.user.id, {
      domain: domain,
      startTime: startTime,
      maxTime: maxTime
    });
    // res.redirect
    res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/question", auth.isUser, auth.isAttempt, async (req, res, next) => {
  try {
    var stuff = await userService.setQuestions(req.user.id);

    let questions = stuff.map(question => {
      return {
        questionId: question._id,
        userSolution: ""
      };
    });
    await A_Database.findByIdAndUpdate(req.user.id, {
      response: questions,
      attempted: true
    });
    const data = await A_Database.find(
      { _id: req.user.id },
      "response domain maxTime"
    ).populate("response.questionId", "question qDomain options answer");
    // console.log(data[0]);

    res.render("quiz", { data: data[0] });
    // res.json(data[0]);
  } catch (error) {
    return next(error);
  }
});

// router.get("/test", async (req, res, next) => {
//   try {
//     let datas = await A_Database.find(
//       { _id: req.user.id },
//       "response"
//     ).populate("response.questionId", "question qDomain answer");
//     let marks = 0;
//     // console.log(datas[0])
//     let data = datas[0]["response"];
//     let news = data.map(ee => {
//       return {
//         ans: ee.questionId.answer,
//         suba: ee.userSolution
//       }
//     })
//     news.forEach(ee => {
//       if (ee.ans == ee.suba) {
//         marks++;
//       }
//     })
//     console.log(marks);
//     res.json(news);
//   } catch (error) {
//     next(error)
//   }
// })
router.post("/question", auth.isUser, auth.isSubmit, async (req, res, next) => {
  try {
    const solutions = req.body.solutions;
    // console.log(solutions);
    var endTime = Date.now();
    let user = await A_Database.findById(req.user.id);
    // console.log(user);
    let responseToUpdate = user.response;
    responseToUpdate.forEach(question => {
      solutions.forEach(solution => {
        if (solution.questionId == question.questionId) {
          question.userSolution = solution.userSolution;
        }
      });
    });
    user.response = responseToUpdate;
    user.submitted = true;
    user.endTime = endTime;
    await user.save();
    await userService.timeStatus(req.user.id);
    console.log("Saved");
    // let datas = await A_Database.find(
    //   { _id: req.user.id },
    //   "response domain maxTime"
    // ).populate("response.questionId", "question qDomain options answer");
    // let count = 0;
    // datas.foreach(ee => {
    //   if (ee.questionId.answer == ee.userSolution) {
    //     marks++;
    //   }
    // })
    // console.log(datas);
    // res.json(datas);
    res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
