

Overview
-----

An instance of Transformer is constructed with a Config object.

Each Config object specifies an array of FieldConfig objects, along
with an optional constructor function (eg., a Tyranid
collection constructor).

If a constructor function is given, it is invoked with the result
object.
Otherwise, the result object is directly returned.

Each FieldConfig object identifies a field on the target object
(ie., a Tyranid document), and a selector that can either be a field
name, or a array of names that represents a path into the source
object.
As a convenient shorthand, if a selector isn't given for a particular
instance of FieldConfig, its name field is used as a selector.

A field config can specify a default value via the defValue key.
If no value is found by the selector, the default value is used
instead.

A config's field config array may have more than one entry per target
field. This is to handle cases where the shape of the input data is
disjoint, ie., if there can be multiple pathways to the same target,
each field config for that field is sequentially tried. The last one
to find a match wins.

Each field config may specify a mapper function to
perform parsing, cleanup, database lookups, and so on.

Each field config may also specify a wrapper function
that is expected to be a constructor function; the function will
be used to construct an object in which to wrap the output data.

In cases where a field is a nested data object, a FieldConfig object can
recursively contain a Config object that indicates how the nested data
should be transformed.
In this way, graphs of objects can be constructed from a single piece of data.

If a nested field is an array, the transformer corresponding to that
field's config object will be invoked on each item in the array, and
the resulting array will be set on the target object.

Fields may also be marked mandatory; if the selector does not find a value
for a mandatory field, an error is added to the running error list.
If any errors exist, the result of the transformation will be a 'Left'
object containing the errors; otherwise it will be a 'Right' object
containing the transformation output.

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

const config = { wrapper: C1
               , fields: [ {name: 'name', selector: 'foo'},
                           {name: 'count', selector: 'cnt'}
                         ]
               };
const transformer = new Transformer(config);
const data = {'foo': 'asd', 'cnt': 2};
const out = transformer.transform(data);

if (isLeft(out)) {
  const errors = getLeft(out);
  console.log('One or more errors have occurred:' + errors);
} else {
  console.log('Successfully got ' + getRight(out));
}

```

See test/transform-spec.ts for more examples.
