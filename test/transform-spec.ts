
import { Transformer, Config, FieldConfig } from "../src/transform";
import * as chai from "chai";
import { Tyr } from 'tyranid';
import * as R from 'ramda';
import * as mongodb from 'mongodb';
import { readFileSync } from 'fs';

const expect = chai.expect;

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

const C2 = new Tyr.Collection({
  id: 'cc2',
  name: 'c2',
  dbName: 'c2',
  fields: {
    _id:  {is: 'mongoid'},
    name: {is: 'string'},
    count: {is: 'integer'},
    nestedId: {is: 'link'},
    raw: {is: 'object'},
  }
});

describe("transform", () => {
  it("should transform a flat object", () => {

    const config = { valueConst: C1
                     , fields: [ {name: 'name', selector: 'foo'},
                                 {name: 'count', selector: 'cnt'}
                               ]
                   };
    const transformer = new Transformer(config);
    const data = {'foo': 'asd', 'cnt': 2};
    const out = transformer.transform(data);

    expect(out instanceof C1).to.be.true;
    expect(out.name).to.equal('asd');
    expect(out.count).to.equal(2);
    expect(out.$orig).to.be.undefined;
    expect(out.id_).to.be.undefined;
  });

  it("should transform a flat object and keep orig", () => {

    const config = { valueConst: C1
                     , fields: [ {name: 'name', selector: 'foo'},
                                 {name: 'count', selector: 'cnt'}
                               ]
                     , keepOrig: true
                   };
    const transformer = new Transformer(config);
    const data = {'foo': 'asd', 'cnt': 2};
    const out = transformer.transform(data);

    expect(out instanceof C1).to.be.true;
    expect(out.name).to.equal('asd');
    expect(out.count).to.equal(2);
    expect(out.$orig).to.equal(data);
    expect(out.id_).to.be.undefined;
  });

  it("should throw if mandatory field missing", () => {

    const config = { valueConst: C1
                     , fields: [ {name: 'name', selector: 'foo', mandatory:true},
                                 {name: 'count', selector: 'cnt'}
                               ]
                   };
    const transformer = new Transformer(config);
    const data = {'cnt': 2};
    expect(transformer.transform.bind(transformer, data)).to.throw(Error);
  });

  it("should transform array fields", () => {

  });

  it("should transform nested objects", () => {

    const leaf = { valueConst: C1
                   , fields: [ {name: 'name', selector: 'foo'},
                               {name: 'count', selector: 'cnt'}
                             ]
                 };
    const top = { valueConst: C2
                  , fields: [ {name: 'name', selector: 'foo'},
                              {name: 'count', selector: 'cnt'},
                              {name: 'nested', selector: ['c1'], config: leaf}
                            ]
                }
    const transformer = new Transformer(top);
    const data = {foo: 'asd', cnt: 2, c1: {foo: 'bar', cnt:3}};
    const out = transformer.transform(data);

    expect(out instanceof C2).to.be.true;
    expect(out.name).to.equal('asd');
    expect(out.count).to.equal(2);
    expect(out.nested).not.to.be.undefined;
    expect(out.nested.name).to.equal('bar');
    expect(out.nested.count).to.equal(3);

    expect(out.id_).to.be.undefined;
  });

  it("should transform data using a parser", () => {
    const config = { valueConst: C1
                     , fields: [ {name: 'name', selector: 'foo',
                                  parser: R.toUpper}
                                 ,
                                 {name: 'count', selector: 'cnt'}
                               ]
                   };
    const transformer = new Transformer(config);
    const data = {'foo': 'asd', 'cnt': 2};
    const out = transformer.transform(data);

    expect(out instanceof C1).to.be.true;
    expect(out.name).to.equal('ASD');
    expect(out.count).to.equal(2);
    expect(out.$orig).to.be.undefined;
    expect(out.id_).to.be.undefined;
  });

  it("should transform some jira data", () => {
    const data =
          JSON.parse(readFileSync('test/data/AWIZ-1543.json').toString());
    const JiraInfo = new Tyr.Collection({
      id: 'jt1',
      name: 'jirainfotest',
      dbName: 'jirainfotest',
      fields: {
        _id: { is: 'mongoid' },
        startDate: { is: 'string' },
        endDate: { is: 'string' },
        name: { is: 'string' },
        description: { is: 'string' },
        updateStatusType: { is: 'number' },
        updateFrequency: { is: 'number' },
        triangleLayerId: { is: 'link' },
        userId: { is: 'link' },
        groupId: { is: 'link' },
        organizationId: { is: 'link' },
        activeStatusType: { is: 'number' },
        creatorId: { is: 'link' },
        ownerId: { is: 'link' },
        watchers: { is: 'array' },
        assignments: {is: 'array'},
        dependencies: {is: 'array'}
      }
    });

    const config =
          { valueConst: JiraInfo
            , fields: [
              {name: 'startDate', selector: ['fields','sprint','startDate']},
              {name: 'endDate', selector: ['fields','sprint','endDate']},
              {name: 'name', selector: ['fields','summary']},
              {name: 'description', selector: ['fields','description']},
              {name: 'updateStatusType', selector: [], mapper: () => {return 0} },
              {name: 'updateFrequency', selector: [], mapper: () => {return 0} },
              {name: 'triangleLayerId', selector: 'triangleLayerId'},
              {name: 'userId', selector: 'userId'},
              {name: 'groupId', selector: 'groupId'},
              {name: 'organizationId', selector: 'organizationId'},
              {name: 'activeStatusType', selector: 'activeStatusType'},
              {name: 'creatorId', selector: 'creatorId'},
              {name: 'ownerId', selector: 'ownerId'},
              {name: 'watchers', selector: 'watchers'},
              {name: 'assignments', selector: 'assignments'},
              {name: 'dependencies', selector: 'dependencies'},
            ]
          };
    const transformer = new Transformer(config);
    const out = transformer.transform(data);

    expect(out instanceof JiraInfo).to.be.true;

  });
});
