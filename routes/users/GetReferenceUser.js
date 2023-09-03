'use strict'

const Joi = require('joi');
const logger = require('winston');
const locals = require('../../locales');
const referenceCollection = require('../../models/reference');
const { ObjectId } = require('mongodb');
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
    userId: Joi.string().description(locals['signIn'].Post.fieldsDescription.email),
}).unknown(false);

const handler = async (req, res) => {
    try {
        const userDetails = await referenceCollection.Aggregate([
            {
                $match: {
                    referenceUserId: ObjectId(req.params.userId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                            },
                        },
                    ],
                    as: "user",
                }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        ])
        if (userDetails) {
            return res.response({
                message: locals["genericErrMsg"]["200"],
                data: userDetails
            }).code(200);
        } else {
            return res.response({
                message: "user not found"
            }).code(204);
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