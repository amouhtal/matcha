const generalCrude = require("../../data/db/crud");
const auth = require("../auth/jwt.utils");
const userRepo = require("../../data/user/user-repository");
const verifocationEmailHelper = require("./helper/verification-email-helper");
const bcrypt = require("bcrypt");
const axios = require("axios");
const userMapper = require("./helper/user-mapper");

const userSignIn = async (userWo, res) => {
    let newUser;
    let user;
    user = await userRepo.getUserByUsernameOrEmail(
        userWo.username,
        userWo.email_address
    );
    if (user) {
        if (user.email_address == userWo.email_address)
            res.status(400).send("email address already used");
        else if (user.username == userWo.username)
            res.status(400).send("username already used");
        return;
    }

    if (!userWo.lantiude && !userWo.longitude) {
        const firstResponse = await axios.get("https://httpbin.org/ip");
        const publicIpAddress = firstResponse.data.origin;
        const response = await fetch(
            `http://ip-api.com/json/${publicIpAddress}`
        );
        data = await response.json();
        // console.log(data);
        userWo.latitude = data.lat;
        userWo.longitude = data.lon;
        userWo.city = data.city;
        userWo.country = data.country;
    }
    userWo.password = await bcrypt.hash(userWo.password, 10);
    newUser = await generalCrude.createRecord(userWo, "users");
    if (newUser) {
        console.log("====================================");
        // console.log(newUser);
        verifocationEmailHelper.sendVerificationEmail(newUser, res);
        res.status(200).send({ message: "user created successfully" });
        // res.redirect('http://localhost:4200')
    } else {
        res.status(400).send("error happend while creating user");
        return;
    }
};

const verifyUserEmail = async (userId, uniqueString, res) => {
    let user_verification = await generalCrude.getRecordBy(
        "user_verification",
        "user_id",
        userId
    );
    // check if user verification record exists
    if (user_verification) {
        //check if user verification record is expiret
        if (user_verification.expires_at < new Date()) {
            generalCrude.deleteRecord(
                "user_verification",
                user_verification.id
            );
            generalCrude.deleteRecord("users", userId);
            let message =
                "Verification link has expired. Please sign up again.";
            res.redirect(`/user/verified/?error=true&message=${message}`);
        }
        // if user verification record is not expired
        else {
            bcrypt
                .compare(uniqueString, user_verification.unique_string)
                .then((result) => {
                    if (result) {
                        generalCrude.updateRecord("users", userId, {
                            verified: true,
                        });
                        generalCrude.deleteRecord(
                            "user_verification",
                            user_verification.id
                        );
                        res.redirect(`/user/verified/`);
                    } else {
                        let message =
                            " invalid verification details passed. Check your inbox";
                        res.redirect(
                            `/user/verified/?error=true&message=${message}`
                        );
                    }
                })
                .catch((error) => {
                    let message =
                        "An error occured while comapring unique string";
                    res.redirect(
                        `/user/verified/?error=true&message=${message}`
                    );
                });
        }
    } else {
        let message =
            "Account record doesn't exist or has been verified already. Plaese sign up or login.";
        res.redirect(`/user/verified/?error=true&message=${message}`);
    }
};

const userLogin = async (username, password, res) => {
    userRepo.getUserByUsernameOrEmail(username, username).then((user) => {
        if (user) {
            if (user.verified) {
                bcrypt.compare(password, user.password).then(async (result) => {
                    if (result) {
                        let accessToken = auth.signJWT(
                            {
                                username: user.username,
                                email_address: user.email_address,
                                user_id: user.id,
                            },
                            "5m"
                        );
                        let session = await generalCrude.createRecord(
                            {
                                user_id: user.id,
                                username: user.username,
                                valid: true,
                            },
                            "sessions",
                            res
                        );
                        // console.log(session);
                        let refreshToken = auth.signJWT(
                            { session_id: session.id },
                            "1d"
                        );

                        // set access token in cookie
                        res.cookie("accessToken", accessToken, {
                            maxAge: 300000, // 5 minutes
                            httpOnly: true,
                        });
                        // set refresh token in cookie
                        res.cookie("refreshToken", refreshToken, {
                            maxAge: 60 * 60 * 24 * 1000, // 1 year
                            httpOnly: true,
                        });
                        res.status(200).send({
                            session: session,
                            message: "user logged in successfully",
                            signCompleteStatus: user.profile_completion_status,
                        });
                    } else {
                        // console.log("invalid password");
                        res.status(400).send("invalid username or password");
                    }
                });
            } else {
                console.log("user not verified");
                res.status(400).send(
                    "user not verified, please check your email"
                );
            }
        } else {
            console.log("invalid username ");
            res.status(400).send("invalid username or password");
        }
    });
};

const completeSignup = async (req, res, completeSignupDTO) => {
    let user = await generalCrude.getRecordBy(
        "users",
        "username",
        req.user.username
    );
    if (!user) {
        res.status(400).send("user not found");
        return;
    }
    let updateUserDTO =
        userMapper.mapCompleteSingupDTOToUpdateUserDTO(completeSignupDTO);
    generalCrude.updateRecord("users", user.id, updateUserDTO);
    res.status(200).send({ message: "user updated successfully" });
};

const checkSession = async (req, res) => {
    let session_id = req.query.session_id;
    if (
        !session_id ||
        (!req.cookies.accessToken && !req.cookies.refreshToken)
    ) {
        return res.status(200).send(false);
    }
    let session = await generalCrude.getRecordBy("sessions", "id", session_id);
    // console.log(session);

    if (!session) res.status(200).send(false);
    else if (session.valid) res.status(200).send(true);
    else res.status(200).send(false);
};

const getUserByUsername = async (res, username) => {
    const user = await generalCrude.getRecordBy("users", "username", username);
    // console.log(user);
    if (!user) res.status(400).send("user not found");
    else res.status(200).send(user);
};

module.exports = {
    userSignIn,
    verifyUserEmail,
    userLogin,
    completeSignup,
    checkSession,
    getUserByUsername,
};
