const ApiBuilder = require('claudia-api-builder'),
      querystring = require('querystring'),
      AWS = require('aws-sdk');

var api = new ApiBuilder(),
    dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TABLE_NAME;

// Función para generar listas de items en formato Collection + JSON a partir
// de la lista de elementos de la tabla en DynamoDB
function genCol(colType, colHref, fields, itemTitle) {
    var links = [
        {rel: "collection", href: "/movies"},
        {rel: "collection", href: "/books"},
    ];

    var condExp = (!itemTitle) ? 'kind = :kind' : 'kind = :kind and title = :title';

    var expAttrs = {
        ':kind' : colType
    };
    if (itemTitle)
        expAttrs[':title'] = itemTitle;


    var params = {
        ExpressionAttributeValues: expAttrs,
        KeyConditionExpression: condExp,
        TableName: tableName
    };
    return dynamoDb.query(params).promise()
        .then(response => {
            var items = response.Items.map(el => {
                return {
                    href: colHref + '/' + querystring.escape(el.title),
                    data: fields.map(function(f) {
                        return {
                            name: f.name,
                            value: el[f.name],
                            prompt: f.prompt,
                            type: f.type
                        }
                    }),
                }
            })
            return {
                collection: {
                    version: '1.0',
                    href: colHref,
                    links: links,
                    items: items,
                    template: {
                        data: fields.map(function(f) {
                            return {
                                name: f.name,
                                prompt: f.prompt,
                                type: f.type
                            }
                        })
                    },
                }
            }
        })
}

// Movie fields
var movieFields = [
    {
        name: 'title',
        prompt: 'Título',
        type: 'text'
    },
    {
        name: 'director',
        prompt: 'Director',
        type: 'text'
    },
    {
        name: 'description',
        prompt: 'Descripción',
        type: 'textarea'
    },
    {
        name: 'embedUrl',
        prompt: 'Trailer en Youtube',
        type: 'embeddedVideo'
    },
    {
        name: 'datePublished',
        prompt: 'Fecha de estreno',
        type: 'date'
    }
];


// Book fields
var bookFields = [
    {
        name: 'title',
        prompt: 'Título',
        type: 'text'
    },
    {
        name: 'author',
        prompt: 'Autor',
        type: 'text'
    },
    {
        name: 'description',
        prompt: 'Descripción',
        type: 'textarea'
    },
    {
        name: 'isbn',
        prompt: 'ISBN',
        type: 'text'
    },
    {
        name: 'image',
        prompt: 'Imagen de portada',
        type: 'image'
    },
    {
        name: 'datePublished',
        prompt: 'Fecha de publicación',
        type: 'date'
    }
];

// Get Movie Collection
api.get('/movies', function (request) { // GET all movies
    return genCol('movie', '/movies', movieFields, false );

});

// Get Movie Item
api.get('/movies/{movie}', function (request) {
    var movieName = querystring.unescape(request.pathParams.movie);
    return genCol('movie', '/movies', movieFields, movieName);
});

// Get Book Collection
api.get('/books', function (request) {
    return genCol('book', '/books', bookFields, false );

});

// Get Book Item
api.get('/books/{book}', function (request) {
    var bookName = querystring.unescape(request.pathParams.book);
    return genCol('book', '/books', bookFields, bookName);
});


// Función para crear/actualizar item a partir de objeto de plantilla en formato
// Collection + JSON
function putItem(data, colType) {
    var item = {};
    item.kind = colType;

    for (var par of data) {
        item[par.name] = par.value;
    }

    var params = {
        TableName: tableName,
        Item: item
    }


    return dynamoDb.put(params).promise();
}

// Función para borrar item
function deleteItem(title, kind) {
    var params = {
        TableName: tableName,
        Key: {
            title: title,
            kind: kind
        }
    }
    return dynamoDb.delete(params).promise();
}

// POST
api.post('/movies', function (request) {
    var data = request.body.template.data;
    return putItem(data, 'movie');
}, { success: 201 });

api.post('/books', function (request) {
    var data = request.body.template.data;
    return putItem(data, 'book');
}, { success: 201 });


//PUT
api.put('/movies/{movie}', function (request) {
    var data = request.body.template.data;
    var movieName = querystring.unescape(request.pathParams.movie);
    return deleteItem(movieName, 'movie')
        .then(res=> {
            return putItem(data, 'movie');
        });
}, { success: 200 });

api.put('/books/{book}', function (request) {
    var data = request.body.template.data;
    var bookName = querystring.unescape(request.pathParams.book);
    return deleteItem(bookName, 'book')
        .then(res=> {
            return putItem(data, 'book');
        });
}, { success: 200 });


// DELETE
api.delete('/movies/{movie}', function (request) {
    var movieName = querystring.unescape(request.pathParams.movie);
    return deleteItem(movieName, 'movie');
}, { success: 204 });

api.delete('/books/{book}', function (request) {
    var bookName = querystring.unescape(request.pathParams.book);
    return deleteItem(bookName, 'book');
}, { success: 204 });

module.exports = api;
