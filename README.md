# ElasticSearch

Wraps the ElasticSearch NPM package and provides helper functions.

`insert(doc)` - inserts a new document into elasticsearch

`update(doc)` - perform a direct update of an existing document

`partialUpdate(mongodbSelector, mongodbMutator)` - perform a 'smart' update of an existing document.  Can directly convert most commonly-used mongodb actions to their groovy counterparts (which elasticsearch can understand).  This is useful because it avoids the need to query mongodb to get the result of the change prior to updating elasticsearch.

## Example App

The following repo contains the regular Meteor Todos example app with user search added.  Each branch adds functionality so you can see the steps taken to add search to an existing application:

https://github.com/Meteor-NY/devshop-elasticsearch

## Installation

```
$ meteor add alanning:elasticsearch
```

## API Documentation

API documentation is generated from jsdoc-style comments in the source code.
To view the documentation locally in your browser, install 
[yuidoc](http://yui.github.io/yuidoc/) (`npm -g install yuidocjs`) then
perform the following steps:

```
$ git clone https://github.com/alanning/meteor-elasticsearch.git
$ cd meteor-elasticsearch
$ yuidoc --server 8080 .
$ open localhost:8080
```

## Running Tests

```
$ git clone https://github.com/alanning/meteor-elasticsearch.git
$ cd meteor-elasticsearch
$ meteor test-packages ./
$ open localhost:3000
```
