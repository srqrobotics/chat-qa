let ObjectId = require("mongodb").ObjectId;
const moment = require('moment');
const { Pay } = require("twilio/lib/twiml/VoiceResponse");
const logger = require('winston');
const LookupCondition = require('./lookupCondition')
const LookupConditionRateCard = require('./lookupConditionForRateCard')
const lookupConditionForChallan = require('./lookupConditionForChallan')
const ObjectPayload = async (Payload, type, sortBy = '_id', DESC = true) => {
  let lookupcondition = [];
  try {
    const limit = Payload.limit ? Payload.limit : 20;
    const start = Payload.page ? (Payload.page - 1) * limit : 0;
    let condition = [];
    if (Payload.page >= 0) {
      delete Payload.page;
    }
    if (Payload.limit >= 0) {
      delete Payload.limit;
    }
    switch (type) {
      case "user":
        if (Payload["userId"]) {
          Payload["_id"] = ObjectId(Payload["userId"]);
          delete Payload["userId"];
        }
        break;
      case "subscriptionPlan":
        if (Payload["spId"]) {
          Payload["_id"] = ObjectId(Payload["spId"]);
          delete Payload["spId"];
        }
        break;
      case "userPlan":
        if (Payload["upId"]) {
          Payload["_id"] = ObjectId(Payload["upId"]);
          delete Payload["upId"];
        }
        lookupcondition.push({
          $lookup: {
            from: "subscriptionPlan",
            localField: "planId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  name: 1,
                  //status: 1,
                },
              },
            ],
            as: "userPlan",
          }
        })
        break;
    }
    condition.push(...lookupcondition);
    for (const key in Payload) {
      if (Payload[key] === null) {
        delete Payload[key];
        continue;
      }
      if (["id", "transactionId"].indexOf(key) <= -1 && key.toLocaleLowerCase().includes("id")) {
        Payload[key] = ObjectId(Payload[key]);
      }
      if (key === "name" || key == "email") {
        condition.push({
          $match: { [key]: { $regex: Payload[key], $options: "i" } },
        });
      } else {
        condition.push({
          $match: {
            [key]: Payload[key],
          },
        });
      }
    }
    condition.push(
      {
        $sort: {
          [sortBy]: DESC ? -1 : 1,
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          [type]: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          [type]: { $slice: ["$" + [type], start, limit] },
        },
      }
    )
    return condition;
  } catch (e) {
    console.log(e);
    logger.error(e.message);
    return Payload;
  }
};
module.exports = { ObjectPayload };