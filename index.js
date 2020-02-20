const ApiBuilder = require('claudia-api-builder'),
      querystring = require('querystring'),
      AWS = require('aws-sdk');

var api = new ApiBuilder(),
    dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TABLE_NAME;

var links = [
    {rel: "collection", href: "/movies", prompt: "Películas"},
    {rel: "collection", href: "/books", prompt: "Libros"},
];

// Función para generar listas de items en formato Collection + JSON a partir
// de la lista de elementos de la tabla en DynamoDB
function genCol(colTitle, colType, colHref, fields, itemTitle) {

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
                    title: colTitle,
                    type: colType,
                    links: links,
                    items: items,
                    template: {
                        data: fields.map(function(f) {
                            return {
                                name: f.name,
                                prompt: f.prompt,
                                type: f.typeTemp
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
        typeTemp: 'text',
        type: 'text'
    },
    {
        name: 'director',
        prompt: 'Director',
        typeTemp: 'text',
        type: 'text'
    },
    {
        name: 'description',
        prompt: 'Descripción',
        typeTemp: 'textarea',
        type: 'textarea'
    },
    {
        name: 'embedUrl',
        prompt: 'Trailer en Youtube',
        typeTemp: 'text',
        type: 'embeddedVideo'
    },
    {
        name: 'datePublished',
        prompt: 'Fecha de estreno',
        typeTemp: 'date',
        type: 'date'
    }
];


// Book fields
var bookFields = [
    {
        name: 'title',
        prompt: 'Título',
        typeTemp: 'text',
        type: 'text'
    },
    {
        name: 'author',
        prompt: 'Autor',
        typeTemp: 'text',
        type: 'text'
    },
    {
        name: 'description',
        prompt: 'Descripción',
        typeTemp: 'textarea',
        type: 'textarea'
    },
    {
        name: 'isbn',
        prompt: 'ISBN',
        typeTemp: 'text',
        type: 'text'
    },
    {
        name: 'image',
        prompt: 'Imagen de portada',
        typeTemp: 'text',
        type: 'image'
    },
    {
        name: 'datePublished',
        prompt: 'Fecha de publicación',
        typeTemp: 'date',
        type: 'date'
    }
];

// Root route
api.get('/', function (request) {
    return {
        collection: {
            version: '1.0',
            title: 'Biblioteca multimedia',
            href: '/',
            links: links
        }
    }
});

// Get Movie Collection
api.get('/movies', function (request) { // GET all movies
    return genCol('Películas', 'movie', '/movies', movieFields, false );

});

// Get Movie Item
api.get('/movies/{movie}', function (request) {
    var movieName = querystring.unescape(request.pathParams.movie);
    return genCol('Película ' + movieName, 'movie', '/movies', movieFields, movieName);
});

// Get Book Collection
api.get('/books', function (request) {
    return genCol('Libros', 'book', '/books', bookFields, false );

});

// Get Book Item
api.get('/books/{book}', function (request) {
    var bookName = querystring.unescape(request.pathParams.book);
    return genCol('Libro ' + bookName, 'book', '/books', bookFields, bookName);
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
