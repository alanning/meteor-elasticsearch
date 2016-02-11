"use strict";

var ES_INDEX = "meteor-elasticsearch-test-index",
    ES_TYPE = "meteor-elasticsearch-test-type",
    ES = new ElasticSearch({
      clientFunctions: ['get']
    }),
    esIndices;

esIndices = Async.wrap(ES.EsClientRaw.indices, ['create', 'exists', 'delete'])

function initIndices () {
  var config = {
        index: ES_INDEX
      };

  if (esIndices.exists(config)) {
    esIndices.delete(config);
  }
  esIndices.create(config);
}

//////////////////////////////////////////////////////////////////////
// elasticsearch - insert
//
Tinytest.add('elasticsearch - insert', function (test) {
  var doc,
      config,
      query,
      result,
      expected,
      actual;

  initIndices();

  doc = {
    _id: Random.id(),
    profile: {
      name: "John",
      age: 10
    },
    score: 300,
    roles: ["manage-users", "view-secrets"]
  };
  config = {
    index: ES_INDEX,
    type: ES_TYPE,
    fieldsToInclude: ['profile', 'roles']
  };

  ES.insert(doc, config);

  result = ES.EsClient.get({
    index: config.index,
    type: config.type,
    id: doc._id
  });

  expected = doc;
  delete expected.score;

  actual = result._source;
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// elasticsearch - update
//
Tinytest.add('elasticsearch - update', function (test) {
  var doc,
      config,
      doc2,
      query,
      result,
      expected,
      actual;

  initIndices();

  doc = {
    _id: Random.id(),
    profile: {
      name: "John",
      age: 10
    },
    score: 300,
    roles: ["manage-users", "view-secrets"]
  };
  config = {
    index: ES_INDEX,
    type: ES_TYPE
  };

  ES.insert(doc, config);

  doc2 = {
    _id: doc._id,
    profile: {
      name: "Roger"
    },
    score: 330
  };
  ES.update(doc2, config);

  result = ES.EsClient.get({
    index: config.index,
    type: config.type,
    id: doc._id
  });

  expected = doc;
  expected.profile.name = doc2.profile.name;
  expected.score = doc2.score;

  actual = result._source;
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// elasticsearch - partialUpdate
//
Tinytest.add('elasticsearch - partialUpdate', function (test) {
  var doc,
      config,
      query,
      result,
      selector,
      mutator,
      expected,
      actual;

  initIndices();

  doc = {
    _id: Random.id(),
    profile: {
      name: "John",
      age: 10
    },
    tags: ["camping", "apparel"],
    ratings: [{rating: 2},
              {rating: 10}],
    score: 300,
    roles: ["manage-users", "view-secrets"]
  };
  config = {
    index: ES_INDEX,
    type: ES_TYPE
  };

  ES.insert(doc, config);

  selector = {
    _id: doc._id
  };
  mutator = {
    $addToSet: {
      "roles": {
        $each: ["manage-users", "super-admin"]
      }
    },
    $set: {
      "profile.name": "Barry",
      "tags.1": "rain gear",
      "ratings.0.rating": 5
    },
    $inc: {
      "score": -10
    },
    $unset: {
      "profile.age": 1
    }
  };
  expected = {
    _id: doc._id,
    profile: {
      name: "Barry"
    },
    tags: ["camping", "rain gear"],
    ratings: [{rating: 5},
              {rating: 10}],
    score: 290,
    roles: ["manage-users", "view-secrets", "super-admin"]
  };

  ES.partialUpdate(selector, mutator, config);

  result = ES.EsClient.get({
    index: config.index,
    type: config.type,
    id: doc._id
  });

  actual = result._source;
  test.equal(actual, expected);
});



//////////////////////////////////////////////////////////////////////
// mongo2es - $set
//
Tinytest.add('mongo2es - $set primitive', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$set: {"profile.name": "John"}};
  expected = {script: "ctx._source.profile.name = \"John\""};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});
Tinytest.add('mongo2es - $set object', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$set: {"profile": {"name": "John",
                                "age": 35}}};
  expected = {script: "ctx._source.profile = [\"name\":\"John\",\"age\":35]"};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});
Tinytest.add('mongo2es - $set elements in array', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$set: {"tags.1": "rain gear"}};
  expected = {script: "ctx._source.tags[1] = \"rain gear\""};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);

  mutator = {$set: {"ratings.0.rating": 2}};
  expected = {script: "ctx._source.ratings[0].rating = 2"};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});
Tinytest.add('mongo2es - $set with $ throws error', function (test) {
  var mutator,
      actual;

  mutator = {$set: {"grades.$": 35}};
  try {
    actual = ElasticSearch.mongo2es(mutator);
    test.fail("Expected error")
  } catch (ex) {
  }
});


//////////////////////////////////////////////////////////////////////
// mongo2es - $unset
//
Tinytest.add('mongo2es - $unset nested field', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$unset: {"profile.age": 1}};
  expected = {script: "ctx._source.profile.remove(\"age\")"};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});

Tinytest.add('mongo2es - $unset top-level field', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$unset: {"name": 1}};
  expected = {script: "ctx._source.remove(\"name\")"};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// mongo2es - $inc
//
Tinytest.add('mongo2es - $inc', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$inc: {"score": 10}};
  expected = {script: "ctx._source.score+=10"};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// mongo2es - $push
//
Tinytest.add('mongo2es - $push', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$push: {"tags": "foo"}};
  expected = {script: "ctx._source.tags+=\"foo\""};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});
Tinytest.add('mongo2es - $push with $each', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$push: {"tags": {$each: ["foo", "bar"]}}};
  expected = {script: "ctx._source.tags+=\"foo\";ctx._source.tags+=\"bar\""};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// mongo2es - $pull
//
Tinytest.add('mongo2es - $pull', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$pull: {"tags": "foo"}};
  expected = {script: "ctx._source.tags-=\"foo\""};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// mongo2es - $pullAll
//
Tinytest.add('mongo2es - $pullAll', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$pullAll: {"tags": ["foo", "bar"]}};
  expected = {script: "ctx._source.tags-=\"foo\";ctx._source.tags-=\"bar\""};
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// mongo2es - $addToSet
//
Tinytest.add('mongo2es - $addToSet', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$addToSet: {"tags": "foo"}};
  expected = {script: "" +
               "if (!ctx._source.tags) {" +
               "  ctx._source.tags = [\"foo\"];" +
               "} else if (!ctx._source.tags.contains(\"foo\")) {" +
               "  ctx._source.tags += \"foo\";" +
               "}"
             };
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});

Tinytest.add('mongo2es - $addToSet with $each', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$addToSet: {"tags": {$each: ["foo", "bar"]}}};
  expected = {script: "" +
               "if (!ctx._source.tags) {" +
               "  ctx._source.tags = [\"foo\"];" +
               "} else if (!ctx._source.tags.contains(\"foo\")) {" +
               "  ctx._source.tags += \"foo\";" +
               "};" +
               "if (!ctx._source.tags.contains(\"bar\")) {" +
               "  ctx._source.tags += \"bar\";" +
               "}"
             };
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});


//////////////////////////////////////////////////////////////////////
// mongo2es - Multi
//

Tinytest.add('mongo2es - multiple operations', function (test) {
  var mutator,
      expected,
      actual;

  mutator = {$addToSet: {"tags": {$each: ["foo", "bar"]}},
             $set: {"profile.name": "John"},
             $pullAll: {"tags": ["foo", "bar"]}};
  expected = {script: "" +
               "if (!ctx._source.tags) {" +
               "  ctx._source.tags = [\"foo\"];" +
               "} else if (!ctx._source.tags.contains(\"foo\")) {" +
               "  ctx._source.tags += \"foo\";" +
               "};" +
               "if (!ctx._source.tags.contains(\"bar\")) {" +
               "  ctx._source.tags += \"bar\";" +
               "};" +
               "ctx._source.profile.name = \"John\";" +
               "ctx._source.tags-=\"foo\";ctx._source.tags-=\"bar\""
             };
  actual = ElasticSearch.mongo2es(mutator);
  test.equal(actual, expected);
});
