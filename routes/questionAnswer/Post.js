'use strict'

const Joi = require('joi');
const logger = require('winston');
const locals = require('../../locales');
const questionAnswerCollection = require("../../models/questionAnswer")
const duplicatCustomer = require('./CheckCustomerExists')
const userPlanCollection = require("../../models/userPlan")
const usersCollection = require("../../models/users")
const { ObjectId } = require('mongodb');
const OpenAI = require('../../config/components/OpenAI')
const moment = require('moment');
const PostPatchPayload = require('../../library/helper/PostPatchPayload');
const GetRequestedUser = require('../../library/helper/GetRequestedUser');
const clientDB = require("../../models/mongodb")
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
    question: Joi.string().required().description(locals['sampleCard'].Post.fieldsDescription.scId)
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
    try {
        await dbSession.withTransaction(async () => {
            let payload = req.payload
            const AuthUser = await GetRequestedUser.User(req.headers.authorization)
            const userId = ObjectId(AuthUser?.userId)
            const userPlan = await userPlanCollection.SelectOne({ userId: userId, status: true, isActive: true })
            const user = await usersCollection.SelectOne({ _id: userId, isSubscribe: false })
            if (!userPlan && !user) {
                code = 409;
                response.message = "Unfortunately, your subscription plan is not active. Please upgrade to access this feature";
                return;
            }
            const startDate = moment().format('YYYY-MM-DD');
            const endDate = moment(userPlan?.endDate);
            const days = endDate.diff(startDate, 'days');

            if (userPlan?.totalPoints <= userPlan?.points && !user) {
                await userPlanCollection.Update({ _id: userPlan._id }, { isActive: false });
                code = 409;
                response.message = "Your API count has reached the maximum limit please upgrade your plan";
                return;
            }
            else if (days <= 0 && !user) {
                await userPlanCollection.Update({ _id: userPlan._id }, { isActive: false });
                code = 409;
                response.message = "Your subscription plan is expired. Please upgrade to access this feature"
                return;
            }
            else if (user?.points <= 0 && !userPlan) {
                code = 409;
                response.message = "Your trial API count has reached the maximum limit please upgrade your plan"
                return;
            }
            else if (user?.points > 0 && !userPlan) {
                await usersCollection.CustomUpdate({
                    _id: userId
                },
                    { $inc: { "points": 1 * -1 } });
            }
            else if (userPlan?.totalPoints > userPlan?.points) {
                await userPlanCollection.CustomUpdate({
                    _id: userPlan._id
                },
                    { $inc: { "points": 1 } });
            }

            const answer = await OpenAI.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an assistant that provides multiple-choice questions and answers."
                      },
                    {
                        role: "user",
                        content: payload.question
                    }
                ],
                temperature: 0.2,
                top_p: 1,
                max_tokens: 1024,
                frequency_penalty: 0,
                presence_penalty: 0,
            });
            
            // const answer = await OpenAI.createCompletion({
            //     model: "text-davinci-002",
            //     prompt: payload.question,
            //     temperature: 0.9,
            //     top_p: 0,
            //     max_tokens: 2048,
            //     frequency_penalty: 0.0,
            //     presence_penalty: 0.0,
            // });

            payload = await PostPatchPayload.ObjectPayload(req, 'post');
            payload["answer"] = answer?.data

            await questionAnswerCollection.Insert(payload, dbSession);
            code = 200;
            response.message = locals["genericErrMsg"]["200"];
            response.data = {
                answer: answer?.data?.choices,
                points: userPlan?.points ? userPlan?.totalPoints - (userPlan?.points + 1) : (user?.points) - 1
            }
        }, transactionOptions);
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
        200: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["200"]), data: Joi.any() }),
        500: Joi.object({ message: Joi.any().default(locals["genericErrMsg"]["500"]) }),
    }
}

module.exports = { validator, response, handler }