

Overview
-----

An instance of Transformer is constructed with a Config object.

Each config object specifies a constructor function (eg., a Tyranid
collection constructor), and an array of FieldConfig objects.

Each FieldConfig object identifies a field on the target object
(ie., a Tyranid document), and a selector that can either be a field
name, or a path into the source object, represented by a list of field names.

In addition, each field config may specify a mapper function to
perform parsing, cleanup, database lookups, and so on.

In cases where a field is a nested data object, a FieldConfig object can
recursively contain a Config object that indicates how the nested data
is transformed.
In this way, graphs of objects can be constructed from a single piece of data.

Fields may also be marked mandatory; if the selector does not find a value
for a mandatory field, an exception is thrown.

Usage example:

``` javascript

const C1 = new Tyr.Collection({
  id: 'cc1',
  name: 'c1',
  dbName: 'c1',
  fields: {
    _id:  {is: 'mongoid'},
    name: {is: 'string'},
    count: {is: 'integer'},
  }
});

const config = { valueConst: C1
               , fields: [ {name: 'name', selector: 'foo'},
                           {name: 'count', selector: 'cnt'}
                         ]
               };
const transformer = new Transformer(config);
const data = {'foo': 'asd', 'cnt': 2};
const out = transformer.transform(data);

```
