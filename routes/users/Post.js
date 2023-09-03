'use strict'

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi)
const logger = require('winston');
const locals = require('../../locales');
const userCollection = require("../../models/users")
const referenceCollection = require("../../models/reference")
const moment = require('moment');
const { ObjectId } = require('mongodb');
const activityLogCollection = require('../../models/activitylogs');
const GetRequestedUser = require('../../library/helper/GetRequestedUser');
const duplicatEmail = require('./CheckEmailExists')
const bcrypt = require('bcryptjs');
const PostPatchPayload = require('../../library/helper/PostPatchPayload');
const clientDB = require("../../models/mongodb");
// const SendUserVerifycationEmail = require('./SendUserVerifycationEmail');
/**
 * @description for user signIn
 * @property {string} authorization - authorization
 * @property {string} lang - language
 * @property {string} categoryName - for select specific category details
 * @returns 200 : Success
 * @returns 500 : Internal Server Error
 * 
 * @author Jarun Borada
 * @date 28-June-2022
 */

const validator = Joi.object({
    name: Joi.string().required().description(locals['users'].Post.fieldsDescription.name),
    password: Joi.string().required().description(locals['users'].Post.fieldsDescription.password),
    email: Joi.string().required().description(locals['users'].Post.fieldsDescription.email),
    url: Joi.string().description(locals['signIn'].Post.fieldsDescription.email),
    points: Joi.number().default(10).description(locals['users'].Post.fieldsDescription.isActive),
    isSubscribe: Joi.boolean().default(false).description(locals['users'].Post.fieldsDescription.isActive),
    reference: Joi.string().description(locals['signIn'].Post.fieldsDescription.email),
    active: Joi.boolean().default(true).description(locals['users'].Post.fieldsDescription.type),
    role: Joi.string().default('user').description(locals['users'].Post.fieldsDescription.role).valid('superadmin', 'admin', 'user')
}).unknown(false);

const handler = async (req, res) => {
    const client = await clientDB.getClient();
    const dbSession = await client.startSession()

    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' }
    };
    let code;
    const response = {}
    let payload = req.payload, userNumber, user, userResult;
    try {
        await dbSession.withTransaction(async () => {
            const AuthUser = await GetRequestedUser.User(req.headers.authorization);
            var referenceUser = null;
            if (payload.reference) {
                referenceUser = await userCollection.SelectOne({
                    userNumber: payload.reference
                })

                if (!referenceUser) {
                    code = 409;
                    response.message = locals["users"]["Post"]["error"]["reference404"];
                    response.data = {};
                    return;
                }
            }

            if (await duplicatEmail.IsExists(payload.email)) {
                code = 409;
                response.message = "This Email Address Is already Exists";
                return;
            }
            do {
                userNumber = String(Math.floor(Math.random() * 1000)).concat('-', String(Math.floor(Math.random() * 1000)).concat('-', String(Math.floor(Math.random() * 1000))));
                user = userCollection.Select({ userNumber: userNumber })
            } while (user.length || userNumber.length != 11)
            payload = await PostPatchPayload.ObjectPayload(req, 'post');
            payload.password = bcrypt.hashSync(payload.password, 10);
            payload["userNumber"] = userNumber;
            payload["ban"] = false;
            userResult = await userCollection.Insert(payload, dbSession);

            if (referenceUser) {
                await referenceCollection.Insert({
                    userId: userResult.insertedIds[0],
                    referenceUserId: ObjectId(referenceUser._id),
                    createAt: moment().format()
                })

                await userCollection.IncPoints(
                    ObjectId(referenceUser._id),
                    10
                )
            }

            let logs = {};
            logs['description'] = `user ${payload.name} is register `;
            logs['type'] = "USER"
            logs['status'] = true;
            logs['itemId'] = ObjectId("" + userResult.insertedIds[0]);
            logs['createdBy'] = AuthUser?.userId ? ObjectId(AuthUser.userId) : "";
            logs['createAt'] = moment().format();
            await activityLogCollection.Insert(logs, dbSession);
            code = 200;
            response.message = locals["genericErrMsg"]["200"];
            response.data = userResult;
        }, transactionOptions);
        if (userResult?.insertedIds[0]) {
            let user = await userCollection.SelectOne({ _id: ObjectId(userResult.insertedIds[0]) });
            //await SendUserVerifycationEmail.sendmail(user, req.payload.url);
        }
        return res.response(response).code(code);
    } catch (e) {
        console.log(e)
        logger.error(e.message)
        return res.response({ message: locals["genericErrMsg"]["500"] }).code(500);
    }
    finally {
        await dbSession.endSession();
    }
}

const response = {
    status: {
        409: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["409"]) }),
        200: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["200"]), data: Joi.object() }),
        500: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["500"]) }),
    }
}

module.exports = { validator, response, handler }