'use strict'

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi)
const logger = require('winston');
const locals = require('../../locales');
const userCollection = require("../../models/users");
const jwt = require('jsonwebtoken');
const config = require('../../config');
var jwtValidator = require('../../middleware/auth');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const SendUserVerifycationEmail = require('./SendUserVerifycationEmail')
const middleware = "";

/**
 * @description get all or specifice order details
 * @property {string} authorization - authorization
 * @property {string} lang - language
 * @property {string} orderName - for select specific order details
 * @returns 200 : Success
 * @returns 500 : Internal Server Error
 * 
 * @author Vatsal Sorathiya
 * @date 11-Dec-2020
 */

const validator = Joi.object({
    email: Joi.string().required().description(locals['signIn'].Post.fieldsDescription.email),
    url: Joi.string().required().description(locals['signIn'].Post.fieldsDescription.email),
    type: Joi.string().required().description(locals['signIn'].Post.fieldsDescription.email).valid("email", "password")
}).unknown(false);

const handler = async (req, res) => {
    try {
        let userResult;

        userResult = await userCollection.Select({ email: req.payload.email });
        if (userResult.length === 0) {
            return res.response({ message: locals["genericErrMsg"]["204"] }).code(204);
        }

        const token = jwt.sign(
            {
                id: "" + userResult[0]._id
            },
            config.auth.authKey,
            {
                expiresIn: "20m"
            }
        );
        if (req.payload.type == "email") {
            await SendUserVerifycationEmail.sendmail(userResult[0], req.payload.url, token)
        }
        else {
            const link = `${req.payload.url}/${token}`

            const awsConfig = {
                accessKeyId: process.env.MAIL_ACCESS_KEY_ID,
                secretAccessKey: process.env.MAIL_SECRET_ACCESS_KEY,
                region: process.env.MAIL_REGION
            }

            const SES = new AWS.SES(awsConfig);
            console.log(process.env.MAIL_FROM_ADDRESS)
            const params = {
                Source: process.env.MAIL_FROM_ADDRESS,
                Destination: {
                    ToAddresses: [userResult[0].email],
                },
                Message: {
                    Subject: {
                        Charset: "UTF-8",
                        Data: 'Forget Password',
                    },
                    Body: {
                        Html:
                        {
                            Charset: "UTF-8",
                            Data: `<!doctype html>
                        <html>
                        <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                            <style>
                                body {
                                    background-color: #F6F6F6;
                                    font-family: sans-serif;
                                    -webkit-font-smoothing: antialiased;
                                    font-size: 14px;
                                    line-height: 1.4;
                                    margin: 0;
                                    padding: 0;
                                    -ms-text-size-adjust: 100%;
                                    -webkit-text-size-adjust: 100%;
                                }
                                table {
                                    border-collapse: separate;
                                    mso-table-lspace: 0pt;
                                    mso-table-rspace: 0pt;
                                    width: 100%;
                                }
                                table td {
                                    font-family: sans-serif;
                                    font-size: 14px;
                                    vertical-align: top;
                                }
                                .body {
                                    background-color: #F6F6F6;
                                    width: 100%;
                                }
                                .container {
                                    display: block;
                                    margin: 0 auto !important;
                                    /* makes it centered */
                                    max-width: 580px;
                                    padding: 10px;
                                    width: 580px;
                                }
                                .content {
                                    box-sizing: border-box;
                                    display: block;
                                    margin: 0 auto;
                                    max-width: 580px;
                                    padding: 10px;
                                }
                                .main {
                                    background: #FFFFFF;
                                    border-radius: 3px;
                                    width: 100%;
                                }
                                .wrapper {
                                    box-sizing: border-box;
                                    padding: 20px;
                                }
                                .content-block {
                                    padding-bottom: 10px;
                                    padding-top: 10px;
                                }
                                .footer {
                                    clear: both;
                                    margin-top: 10px;
                                    text-align: center;
                                    width: 100%;
                                }
                                .footer td,
                                .footer p,
                                .footer span,
                                .footer a {
                                    color: #999999;
                                    font-size: 12px;
                                    text-align: center;
                                }
                                .btn a {
                                    background-color: #FFFFFF;
                                    border: solid 1px #D0DB34;
                                    border-radius: 5px;
                                    box-sizing: border-box;
                                    color: #3498DB;
                                    cursor: pointer;
                                    display: inline-block;
                                    font-size: 14px;
                                    font-weight: bold;
                                    margin: 0;
                                    padding: 12px 25px;
                                    text-decoration: none;
                                    text-transform: capitalize;
                                }
                                .btn-primary a {
                                    background-color: #FFB300;
                                    border-color: #FFB300;
                                    color: #FFFFFF;
                                }
                                .powered-by a {
                                    text-decoration: none;
                                }
                                hr {
                                    border: 0;
                                    border-bottom: 1px solid #F6F6F6;
                                    margin: 20px 0;
                                }
                            </style>
                        </head>
                        <body>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
                                <tr>
                                    <td>&nbsp;</td>
                                    <td class="container">
                                        <div class="content">
                                            <table role="presentation" class="main">
                                                <tr>
                                                    <td class="wrapper">
                                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td>&nbsp;</td>
                                                            </tr>
                                                            <tr>
                                                                <td>&nbsp;</td>
                                                            </tr>
                                                            <tr>
                                                                <td style='text-align: center;'><img src="WE-full-logo.png" alt="">
                                                                    <hr>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>&nbsp;</td>
                                                            </tr>
                                                            <tr>
                                                                <td>&nbsp;</td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <p>
                                                                        <b>Hello `+ userResult[0].name + `,</b>
                                                                        <br>
                                                                        You have requested a new password for the Wall-Empire account
                                                                        associated with <b>`+ userResult[0].email + `</b>.
                                                                        <br>
                                                                        No changes have been made to your account yet.
                                                                        <br>
                                                                        You can reset your password by clicking the button below:
                                                                    <div class="btn btn-primary" align="left">
                                                                        <div>
                                                                            <a href="`+ link + `" target="_blank">Reset Password</a>
                                                                        </div>
                                                                    </div>
                                                                    <br>
                                                                    If you did not request a new password, please let us know immediately by
                                                                    replying to this email.
                                                                    <br>
                                                                    <br>
                                                                    <br> <br>
                                                                    <b>Yours, <br>
                                                                        The Wall-Empire team
                                                                    </b>
                                                                    <br>
                                                                    </p>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            <div class="footer">
                                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td class="content-block powered-by">
                                                            Powered by <a href="https://wall-empire.com/" target="_blank">Wall-Empire</a>.
                                                        </td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </body>
                        </html>`
                        }
                    }
                }
            }

            const emailResult = SES.sendEmail(params).promise();
            emailResult.then(data => {
                console.log('Mail Send Sucessfully!', data);
            })
                .catch(err => {
                    console.log(err);
                })
        }
        return res.response({
            message: locals["genericErrMsg"]["200"],
            data: {
                token: token
            }
        }).code(200);
    } catch (e) {
        console.log(e)
        logger.error(e.message)
        return res.response({ message: locals["genericErrMsg"]["500"] }).code(500);
    }
}

const response = {
    status: {
        200: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["200"]), data: Joi.any() }),
        204: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["204"]) }),
        500: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["500"]) }),
    }
}

module.exports = { validator, response, handler }