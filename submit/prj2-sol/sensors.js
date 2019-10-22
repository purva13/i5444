'use strict';

const AppError = require('./app-error');
const validate = require('./validate');

const assert = require('assert');
const mongo = require('mongodb').MongoClient;

const SENSORTYPES = "sensorTypes";
const SENSORS = "sensors";
const SENSORDATA = "sensorsData";

class Sensors {
    constructor() {
        this.database = null;
        this.dbo = null;
    }

    /** Return a new instance of this class with database as
     *  per mongoDbUrl.  Note that mongoDbUrl is expected to
     *  be of the form mongodb://HOST:PORT/DB.
     */
    static async newSensors(mongoDbUrl) {
        //@TODO
        function testURL(mongoDbUrl){
            var pattern =new RegExp(
                "^(mongodb)\\:\\/\\/[a-zA-Z0-9.]+\\:[0-9]+\\/[a-zA-Z]+"
            );
            return pattern.test(mongoDbUrl);
        }
        if(!testURL(mongoDbUrl)){
            const err = AppError(101, "Invalid MongoDB URL");
            process.exit(1);
        }
        else{
            var urlSplit = mongoDbUrl.split('/');
            var dbname = urlSplit[urlSplit.length-1];
            var url = urlSplit[0];
            urlSplit[1] = '//';
            for(var i =1; i<urlSplit.length-1;i++){
                url = url.concat(urlSplit[i]);
            }

        }
        let s = new Sensors();
        s.database = await mongo.connect(mongoDbUrl, MONGO_OPTIONS);
        s.dbo = s.database.db(dbname);
        return s;
    }

    /** Release all resources held by this Sensors instance.
     *  Specifically, close any database connections.
     */
    async close() {
        //@TODO
        await this.database.close();
    }

    /** Clear database */
    async clear() {
        //@TODO
        await this.dbo.collection(SENSORTYPES).remove();
        await this.dbo.collection(SENSORS).remove();
        await this.dbo.collection(SENSORDATA).remove();

    }

    /** Subject to field validation as per validate('addSensorType',
     *  info), add sensor-type specified by info to this.  Replace any
     *  earlier information for a sensor-type with the same id.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async addSensorType(info) {
        const sensorType = validate('addSensorType', info);
        this.dbo.collection(SENSORTYPES).insertOne(sensorType, function(err, res) {
            if (err) throw err;
        });
    }

    /** Subject to field validation as per validate('addSensor', info)
     *  add sensor specified by info to this.  Note that info.model must
     *  specify the id of an existing sensor-type.  Replace any earlier
     *  information for a sensor with the same id.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async addSensor(info) {
        const sensor = validate('addSensor', info);
        //@TODO
        this.dbo.collection(SENSORS).insertOne(sensor, function(err, res) {
            if (err) throw err;
        });
    }

    /** Subject to field validation as per validate('addSensorData',
     *  info), add reading given by info for sensor specified by
     *  info.sensorId to this. Note that info.sensorId must specify the
     *  id of an existing sensor.  Replace any earlier reading having
     *  the same timestamp for the same sensor.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async addSensorData(info) {
        const sensorData = validate('addSensorData', info);
        let sensorObj = await this.dbo.collection(SENSORS).find({"id" : sensorData.sensorId}).toArray();
        let sensorTypeObj = await this.dbo.collection(SENSORTYPES).find({"id" : sensorObj[0].model}).toArray();
        if(sensorTypeObj[0].limits.min>sensorData.value || sensorTypeObj[0].limits.max<sensorData.value){
            sensorData.statuses="error";
        }
        else if(sensorObj[0].expected.min>sensorData.value || sensorObj[0].expected.max<sensorData.value){
            sensorData.statuses="outOfRange";
        }
        else if(sensorTypeObj[0].limits.min<sensorData.value || sensorTypeObj[0].limits.max>sensorData.value){
            sensorData.statuses="ok";
        }

        this.dbo.collection(SENSORDATA).insertOne(sensorData, function(err, res) {
            if (err) throw err;
        });
    }

    /** Subject to validation of search-parameters in info as per
     *  validate('findSensorTypes', info), return all sensor-types which
     *  satisfy search specifications in info.  Note that the
     *  search-specs can filter the results by any of the primitive
     *  properties of sensor types (except for meta-properties starting
     *  with '_').
     *
     *  The returned value should be an object containing a data
     *  property which is a list of sensor-types previously added using
     *  addSensorType().  The list should be sorted in ascending order
     *  by id.
     *
     *  The returned object will contain a lastIndex property.  If its
     *  value is non-negative, then that value can be specified as the
     *  _index meta-property for the next search.  Note that the _index
     *  (when set to the lastIndex) and _count search-spec
     *  meta-parameters can be used in successive calls to allow
     *  scrolling through the collection of all sensor-types which meet
     *  some filter criteria.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async findSensorTypes(info) {
        //@TODO
        const searchSpecs = validate('findSensorTypes', info);
        let index = parseInt(searchSpecs._index) || 0;
        let count = parseInt(searchSpecs._count+index) || 5;
        const helper = searchSpecs;
        Object.keys(helper).forEach((key) => (helper[key] == null || key === '_index' ||  key === '_count' )  && delete helper[key]);
        let x = await this.dbo.collection(SENSORTYPES).find(helper).toArray();
        if(info._count && info._index){
            var result = x.slice(index,count);
            var y  = count;
        }
        else if(info._count) {
             var result = x.slice(0,searchSpecs._count);
             var y = count;
        }
        else if(info._index){
            var result = x[index-1];
            var y = -1;
        }
        else {
            var result = x.slice(0,5);
            var y = -1;
        }
        return { data: result, nextIndex: y };
    }

    /** Subject to validation of search-parameters in info as per
     *  validate('findSensors', info), return all sensors which satisfy
     *  search specifications in info.  Note that the search-specs can
     *  filter the results by any of the primitive properties of a
     *  sensor (except for meta-properties starting with '_').
     *
     *  The returned value should be an object containing a data
     *  property which is a list of all sensors satisfying the
     *  search-spec which were previously added using addSensor().  The
     *  list should be sorted in ascending order by id.
     *
     *  If info specifies a truthy value for a _doDetail meta-property,
     *  then each sensor S returned within the data array will have an
     *  additional S.sensorType property giving the complete sensor-type
     *  for that sensor S.
     *
     *  The returned object will contain a lastIndex property.  If its
     *  value is non-negative, then that value can be specified as the
     *  _index meta-property for the next search.  Note that the _index (when
     *  set to the lastIndex) and _count search-spec meta-parameters can be used
     *  in successive calls to allow scrolling through the collection of
     *  all sensors which meet some filter criteria.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async findSensors(info) {
        //@TODO
        const searchSpecs = validate('findSensors', info);
        let index = parseInt(searchSpecs._index) || 0;
        let count = parseInt(searchSpecs._count+index) || 5;
        const helper = searchSpecs;
        Object.keys(helper).forEach((key) => (helper[key] == null || key === '_index' ||  key === '_count' )  && delete helper[key]);
        let x = await this.dbo.collection(SENSORS).find(helper).toArray();
        if(info._count && info._index){
            var result = x.slice(index,count);
            var y  = count;
        }
        else if(info._count) {
            var result = x.slice(0,searchSpecs._count);
            var y = count;
        }
        else if(info._index){
            var result = x[index-1];
            var y = -1;
        }
        else {
            var result = x.slice(0,5);
            var y = -1;
        }
        return { data: result, nextIndex: y };
    }

    /** Subject to validation of search-parameters in info as per
     *  validate('findSensorData', info), return all sensor readings
     *  which satisfy search specifications in info.  Note that info
     *  must specify a sensorId property giving the id of a previously
     *  added sensor whose readings are desired.  The search-specs can
     *  filter the results by specifying one or more statuses (separated
     *  by |).
     *
     *  The returned value should be an object containing a data
     *  property which is a list of objects giving readings for the
     *  sensor satisfying the search-specs.  Each object within data
     *  should contain the following properties:
     *
     *     timestamp: an integer giving the timestamp of the reading.
     *     value: a number giving the value of the reading.
     *     status: one of "ok", "error" or "outOfRange".
     *
     *  The data objects should be sorted in reverse chronological
     *  order by timestamp (latest reading first).
     *
     *  If the search-specs specify a timestamp property with value T,
     *  then the first returned reading should be the latest one having
     *  timestamp <= T.
     *
     *  If info specifies a truthy value for a doDetail property,
     *  then the returned object will have additional
     *  an additional sensorType giving the sensor-type information
     *  for the sensor and a sensor property giving the sensor
     *  information for the sensor.
     *
     *  Note that the timestamp search-spec parameter and _count
     *  search-spec meta-parameters can be used in successive calls to
     *  allow scrolling through the collection of all readings for the
     *  specified sensor.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async findSensorData(info) {
        const searchSpecs = validate('findSensorData', info);
        let sensorObj = await this.dbo.collection(SENSORS).find({"id" : searchSpecs.sensorId}).toArray();
        let sensorTypeObj = await this.dbo.collection(SENSORTYPES).find({"id" : sensorObj[0].model}).toArray();
        let sensorDataResult = await this.dbo.collection(SENSORDATA).find({"sensorId" : searchSpecs.sensorId}).toArray();
        let result ={};
        if(info.timestamp){
            let temp=sensorDataResult.filter(x => x.timestamp===searchSpecs.timestamp);
            let temp2= sensorDataResult.filter(x => x.timestamp < searchSpecs.timestamp);
            sensorDataResult = temp.concat(temp2);
        }
        if(info.value){
            sensorDataResult=sensorDataResult.filter(x => x.value===searchSpecs.value);
        }
        if(info.statuses){
            sensorDataResult = sensorDataResult.filter(function(e) {
                return Array.from(searchSpecs.statuses).includes(e.statuses)
            });
        }
        if(info._doDetail){
            result.sensor = sensorObj[0];
            result.sensorType = sensorTypeObj[0];
        }
        if(info._count){
            sensorDataResult=sensorDataResult.slice(0,searchSpecs._count);
        }
        if(!info._count){
            sensorDataResult=sensorDataResult.slice(0,5);
        }
        sensorDataResult.sort((a, b) => (a.timestamp > b.timestamp) ? -1 : 1)
        result.data = sensorDataResult;
        return result;
    }
}
//class Sensors

module.exports = Sensors.newSensors;

//Options for creating a mongo client
const MONGO_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

function inRange(value, range) {
    return Number(range.min) <= value && value <= Number(range.max);
}
