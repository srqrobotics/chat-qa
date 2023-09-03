'use strict'

const Joi = require('joi');
const logger = require('winston');
const locals = require('../../locales');
const userCollection = require('../../models/users');
const { ObjectId } = require('mongodb');
const GetRequestedUser = require('../../library/helper/GetRequestedUser');
/**
 * @description for user signIn
 * @property {string} authorization - authorization
 * @property {string} lang - language
 * @property {string} categoryName - for select specific category details
 * @returns 200 : Success
 * @returns 500 : Internal Server Error
 * 
 * @author Vatsal Sorathiya
 * @date 11-Dec-2020
 */

const validator = Joi.object({
    token: Joi.string().description(locals['signIn'].Post.fieldsDescription.email),
}).unknown(false);

const handler = async (req, res) => {
    try {
            const AuthUser = await GetRequestedUser.User(req.params.token);
            const userId=AuthUser?.userId?ObjectId(AuthUser?.userId):""
            const userDetails = await userCollection.SelectOne({_id: userId})
            if (userId && userDetails) {
                return res.response({
                    message: locals["genericErrMsg"]["200"],
                    data: userDetails
                }).code(200);
            } else {
                return res.response({
                    message: "user not found"
                }).code(204);
                //return res.response({ message: 'user not found' }).code(204);
            }
    } catch (e) {
        console.log(e)
        logger.error(e.message)
        return res.response({
            message: locals["genericErrMsg"]["500"]
        }).code(500);
    }
}

const response = {
    status: {
        401: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["401"]) }),
        200: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["200"]), data: Joi.any() }),
        204: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["204"]) }),
        500: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["500"]) }),
    }
}

module.exports = { validator, response, handler }