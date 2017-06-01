
import { Transformer, Either, Left, Right, isLeft, isRight, left, right } from '../src/transform';
import * as chai from 'chai';
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

describe('transform', () => {
  it('should transform a flat object', () => {

    const config = { wrapper: C1
                     , fields: [ {selector: 'foo', name: 'name'},
                                 {name: 'count', selector: 'cnt'}
                               ]
                   };
    const transformer = new Transformer(config);
    const data = {'foo': 'asd', 'cnt': 2};

    const ret = transformer.transform(data);

    expect(isRight(ret)).to.be.true;
    const out = right(ret);
    expect(out instanceof C1).to.be.true;
    expect(out.name).to.equal('asd');
    expect(out.count).to.equal(2);
    expect(out.$orig).to.be.undefined;
    expect(out.id_).to.be.undefined;
  });

  it('should transform undefined', () => {
    const config = {fields: []};
    const transformer = new Transformer(config);
    const data = undefined;

    const ret = transformer.transform(data);
    expect(isRight(ret)).to.be.true;
    expect(right(ret)).to.be.eql({});
  });

  it('should transform a flat object and keep orig', () => {

    const config = { wrapper: C1
                     , fields: [ {name: 'name', selector: 'foo'},
                                 {name: 'count', selector: 'cnt'}
                               ]
                     , keepOrig: true
                   };
    const transformer = new Transformer(config);

    const data = {'foo': 'asd', 'cnt': 2};
    const ret = transformer.transform(data);

    expect(isRight(ret)).to.be.true;
    const out = right(ret);
    expect(out instanceof C1).to.be.true;
    expect(out.name).to.equal('asd');
    expect(out.count).to.equal(2);
    expect(out.$orig).to.equal(data);
    expect(out.id_).to.be.undefined;
  });

  it('should be Left if mandatory field missing', () => {

    const config = { wrapper: C1
                     , fields: [ {name: 'name', selector: 'foo', mandatory:true},
                                 {name: 'count', selector: 'cnt'}
                               ]
                   };
    const transformer = new Transformer(config);
    const data = {'cnt': 2};

    const ret = transformer.transform(data);
    expect(isLeft(ret)).to.be.true;
    const out = left(ret);
    expect(out).to.have.length(1);
  });

  it('should transform nested objects', () => {

    const bottom = { wrapper: C1
                   , fields: [ {name: 'name', selector: 'foo'},
                               {name: 'count', selector: 'cnt'}
                             ]
                 };
    const top = { wrapper: C2
                  , fields: [ {name: 'name', selector: 'foo'},
                              {name: 'count', selector: 'cnt'},
                              {name: 'nested', selector: ['c1'], config: bottom}
                            ]
                }
    const transformer = new Transformer(top);
    const data = {foo: 'asd', cnt: 2, c1: {foo: 'bar', cnt:3}};
    const ret = transformer.transform(data);

    expect(isRight(ret)).to.be.true;
    const out = right(ret);
    expect(out instanceof C2).to.be.true;
    expect(out.name).to.equal('asd');
    expect(out.count).to.equal(2);
    expect(out.nested).not.to.be.undefined;
    expect(out.nested instanceof C1).to.be.true;
    expect(out.nested.name).to.equal('bar');
    expect(out.nested.count).to.equal(3);
    expect(out.id_).to.be.undefined;

  });

  it('should be Left if nested mandatory field missing', () => {
    const bottom = { wrapper: C1
                     , fields: [ {name: 'name', selector: 'foo'},
                                 {name: 'count', selector: 'cnt', mandatory: true}
                               ]
                   };
    const top = { wrapper: C2
                  , fields: [ {name: 'name', selector: 'foo', mandatory: true},
                              {name: 'count', selector: 'cnt'},
                              {name: 'nested', selector: ['c1'], config: bottom}
                            ]
                }
    const transformer = new Transformer(top);
    const data = {'cnt': 2, c1: {foo: 'bar'}}

    const ret = transformer.transform(data);
    expect(isLeft(ret)).to.be.true;
    const out = left(ret);
    expect(out).to.have.length(2);
  });

  it('should use default values', () => {
    const config = {fields:
                    [ {name: 'def0', defValue: undefined},
                      {name: 'def1', defValue: 0},
                      {name: 'def2', defValue: 1},
                      {name: 'def3', defValue: 'def'}
                    ]
                   };
    const transformer = new Transformer(config);
    const data = {};

    const ret = transformer.transform(data);

    expect(isRight(ret)).to.be.true;
    const out = right(ret);
    expect(out.def0).to.be.undefined;
    expect(out.def1).to.equal(0);
    expect(out.def2).to.equal(1);
    expect(out.def3).to.equal('def');
  });

  it('should use a field wrapper', () => {
    const config = {fields:
                    [ {name: 'date', wrapper: Date}
                    ]
                   };
    const transformer = new Transformer(config);
    const data = {date: '2017-05-23T21:17:21.621Z'};

    const ret = transformer.transform(data);

    expect(isRight(ret)).to.be.true;
    const out = right(ret);
    expect(out.date instanceof Date).to.be.true;
    expect(out.date.getTime()).to.equal(new Date('2017-05-23T21:17:21.621Z').getTime());
  });

  it('should transform data using a mapper', () => {
   const config = { wrapper: C1
                    , fields: [ {name: 'name', selector: 'foo',
                                 mapper: R.toUpper}
                                ,
                                {name: 'count', selector: 'cnt'}
                              ]
                  };
    const transformer = new Transformer(config);
    const data = {'foo': 'asd', 'cnt': 2};
    const ret = transformer.transform(data);
    expect(isRight(ret)).to.be.true;
    const out = right(ret);
    expect(out instanceof C1).to.be.true;
    expect(out.name).to.equal('ASD');
    expect(out.count).to.equal(2);
    expect(out.$orig).to.be.undefined;
    expect(out.id_).to.be.undefined;
  });
});

describe('functional', () => {

  it('should transform some jira data into a triangle layer item', () => {

    // Note: These definitions were cut-and-pasted from
    // app/server/_shared/models/triangle-layer-item.model.js
    // and then pared down a bit for testing purposes, since it didn't
    // seem like a good idea for this supposedly generic module to
    // depend on crosslead-platform.

    const Assignment = {
      is: 'object',

      fields: {
        id:           { is: 'mongoid' },
        assignedById: { link: 'user' },
        reports:      { is: 'boolean' },
        layerId:      { link: 'triangleLayer' },
        fromLayerId:  { link: 'triangleLayer' },
        groupId:      { link: 'group' },
        userId:       { link: 'user' },
        isJira:       { is: 'boolean' }
      }
    };

    const Milestone = {
      is: 'object',

      fields: {
        //id:           { is: 'mongoid' },
        date: { is: 'date' },
        text: { is: 'string' }
      }
    };

    const TriangleLayerItemStatusType = new Tyr.Collection({
      id: 'tl4',
      name: 'triangleLayerItemStatusType',
      dbName: 'triangleLayerItemStatusTypes',
      enum: true,
      fields: {
        _id:  { is: 'integer' },
        name: { is: 'string', labelField: true }
      },
      values: [
        [ '_id', 'name' ],
        [ 1, 'Manual' ],
        [ 2, 'Estimated' ],
        [ 3, 'Auto' ]
      ]
    });

    const TriangleLayerItemDependent = {
      is: 'object',

      fields: {
        id:                    { is: 'mongoid' },
        createdAt:             { is: 'date' },
        updatedAt:             { is: 'date' },
        priority:              { is: 'integer' },
        status:                { link: 'triangleLayerItemDependencyStatus' },
        requestMessage:        { is: 'string' },
        dependsOnLayerItemId:  { link: 'triangleLayerItem' },
        requestLayerId:        { link: 'triangleLayer' },
        requestUserId:         { link: 'user' },
        typeId:                { link: 'triangleLayerItemDependencyType', required : true, defaultValue: 1 },
      }
    };

    /**
     * A link to a given metric type with specific metadata
     for this individual triangle layer item
    */
    const TriangleLayerItemAttachedMetric = {
      is: 'object',
      fields: {
        metricId:        { link: 'metric', required: true },
        name:            { is: 'string', required: true }, // custom name for the metric on this item
        description:     { is: 'string' },
        format:          { is: 'string' },
        formatType:      { is: 'integer' },
        precision:       { is: 'integer' },
        large:           { is: 'boolean' }
      }
    };

    const JiraIconProperty = {
      is: 'object',
      fields: {
        iconUrl: { is: 'string' },
        name: { is: 'string' },
        color: { is: 'string' }
      }
    };

    const JiraLinkedIssue = {
      is: 'object',
      fields: {
        relation: { is: 'string' },
        relatedIssueKey: { is: 'string' }
      }
    };

    const JiraIssue = {
      is: 'object',
      historical: true,
      fields: {
        id: { is: 'string' },
        key: { is: 'string' },
        urlPrefix: { is: 'string' },
        projectId: { is: 'string' },
        issueType: JiraIconProperty,
        priority: JiraIconProperty,

        status: JiraIconProperty,
        estimatedSeconds: { is: 'integer' },
        loggedSeconds: { is: 'integer' },
        linkedIssues: { is: 'array', of: JiraLinkedIssue }
      }
    };

    const TriangleLayerItemStatus = {
      is: 'object',

      fields: {
        id:          { is: 'mongoid' },
        createdAt:   { is: 'date' },
        updatedAt:   { is: 'date' },
        percent:     { is: 'integer' },
        color:       { is: 'integer' },
        type:        { link: 'triangleLayerItemStatusType' }
      }
    };

    const TriangleLayerItem = new Tyr.Collection({
      id: 't01',
      name: 'triangleLayerItem',
      dbName: 'triangleLayerItems',
      timestamps : true,
      historical : true,
      fields: {
        _id:              { is: 'mongoid' },
        createdAt:        { is: 'date' },
        updatedAt:        { is: 'date' },
        startDate:        { is: 'date' },
        endDate:          { is: 'date' },
        allDay:           { is: 'boolean', note: 'Flag for all-day events' },
        name:             { is: 'string',
                            required : true,
                            labelField: true,
                            historical: true,
                            note: 'Name/Title of the item' },
        description:      { is: 'string',
                            historical: true,
                            note: 'Longer description of the item (usually HTML)' },
        transferred:      { is: 'boolean',
                            note: 'Flag to determine if this has been transferred when another user was deleted' },
        updateStatusType: { link: 'triangleLayerItemUpdateStatus',
                            required: true,
                            defaultValue: 0,
                            historical: true,
                            note: 'The type of status updates that occur on this item' },
        updateFrequency:  { link: 'triangleLayerItemUpdateFrequency',
                            required: true,
                            defaultValue: 0,
                            historical: true,
                            note: 'How often it is expected that the status will be updated on this item' },
        updateMetricId:   { is: 'mongoid',
                            historical: true,
                            note: 'If metric type of udpate status, this is the id of the metric it points to' },
        triangleLayerId:  { link: 'triangleLayer', historical: true, note: 'The layer (if any) that this item resides on' },
        userId:           { link: 'user',
                            relate: 'ownedBy',
                            direction: 'outgoing',
                            graclTypes: [ 'resource' ],
                            historical: true,
                            note: 'The user owner of this item' },
        groupId:          { link: 'group', historical: true, note: 'The group owner of this item' },
        organizationId:   { link: 'organization', note: 'The organization owner of this item' },
        statuses:         { is: 'array',
                            of: TriangleLayerItemStatus,
                            historical: true,
                            note: 'Array of statuses, with date of the statuses' },
        watchers:         { is: 'array',
                            of: { link: 'user' },
                            historical: true,
                            note: 'Array of user ids, for users that have favorited this item' },

        dependencies:     { is: 'array',
                            of: TriangleLayerItemDependent,
                            historical: true,
                            note: 'Dependent tasks or other items of this item' },
        parentRequests:   { is: 'array',
                            of: TriangleLayerItemDependent,
                            historical: true,
                            note: 'Any item requests for supported items' },
        attachedMetrics:  { is: 'array',
                            of: TriangleLayerItemAttachedMetric,
                            historical: true,
                            note: 'Array of metrics attached to this item' },

        private:          { is: 'boolean',
                            historical: true,
                            note: 'Flag if this is a private item (not publically visible)' },
        assignments:      { is: 'array',
                            of: Assignment,
                            historical: true,
                            note: 'Users and Groups assigned to this item' },
        phase:            { is: 'string',
                            historical: true,
                            note: 'Optional phase this item is in' },
        milestones:       { is: 'array',
                            of: Milestone,
                            historical: true,
                            note: 'Optional array of milestones for this item' },
        activeStatusType: { link: 'triangleLayerItemActiveStatusType',
                            required: true,
                            defaultValue: 1,
                            historical: true,
                            note: 'Status of item' },
        dueAt: {is: 'date', historical: true, note: 'Due date, if this is a task' },
        startAt: {is: 'date', historical: true, note: 'Start date, if this is a task' },
        closedAt: {is: 'date', historical: true, note: 'Closed date, if this is a task' },

        creatorId: { link: 'user', note: 'Creator of calendar event item'},
        creatorEmail: { is: 'string', note: 'Creator of calendar event item when creator is not CrossLead user' },
        assignedToId: {link: 'user', historical: true, note: 'If a task, points to assigned user' }, //this is redundant with array
        inSupportOfId: {link: 'triangleLayerItem', historical: true, note: 'If a task, points to item it supports' },
        descriptionText: {is: 'string', historical: true, note: 'Text value of description' },//still being used in search
        location: { is: 'string', historical: true, note: 'Location of calendar event item' },
        resolutionNotes: {is: 'string', historical: true, note: 'Given description of resolution'},
        priority: {link: 'tmPriority', historical: true, note: 'If task, the priority of the task' },
        origEstimate: { is: 'integer',
                        historical: true,
                        note: 'The original estimate of how long this will take to complete' },
        currentEstimate: {is: 'integer', historical: true, note: 'Current estimate of how long is left until complete' },
        timeSpent: {is: 'integer', historical: true, note: 'Time taken so far on this item' },
        layerType: { link: 'triangleLayerItemLayerType',
                     note: 'If not default item with triangleLayerId, this specifies the type' },
        linkType: { link: 'triangleLayerItemLinkType',
                    historical: true,
                    note: 'If task and it is linked to something, this shows what type opf link' },

        updateParentStatus: {is: 'boolean', historical: true}, // deprecated ?  investigate
        tmStatus: { link: 'triangleLayerItemTaskStatus', historical: true, note: 'If task, this is the task status' },
        tmId: {is: 'string', note: 'If task, generated unique id for it' },
        taskType: { link: 'triangleLayerItemTaskType', historical: true, note: 'Distinguishes task type from event type' },
        tagIds: {is: 'array', of: {link: 'tag'}, historical: true, note: 'Associated shared tags' },

        calendarEventICalUId: { is: 'string', note: 'Calendar event iCalUId identifier, unique across all providers' },
        scheduledFor: { is: 'array',
                        of: { link: 'user' },
                        historical: true,
                        note: 'Users that have imported event in DA' },
        removedFor: { is: 'array',
                      of: { link: 'user' },
                      historical: true,
                      note: 'Users that have removed event in DA' },
        attendedBy: { is: 'array',
                      of: { link: 'user' },
                      historical: true,
                      note: 'Users that have confirmed attendance in DA' },
        jiraIssue: JiraIssue,
        jiraUrl: { is: 'string', client: true, note: 'If Jira issue, full link to the issue in Jira' },
        roadblockText: {is: 'string', note: 'Description of roadblock' },
      },
    });

    const jiraIssueConfig =
          { fields:
            [{name: 'id', mapper: parseInt},
             {name: 'key'},
             {name: 'labels', selector: ['fields','labels']},
             {name: 'projectId',
              selector: ['fields','project','id'],
              mapper: parseInt
             },
             {name: 'urlPrefix',
              defValue: 'https://crosslead.atlassian.net/browse/'
             },
             {name: 'issueType',
              config:
              {fields:
               [{name: 'name', selector: ['fields','issuetype','name']},
                {name: 'iconUrl', selector: ['fields','issuetype','iconUrl']}
               ]}
             },
             {name: 'priority',
              config:
              {fields:
               [{name: 'name', selector: ['fields','priority','name']},
                {name: 'iconUrl', selector: ['fields','priority','iconUrl']}
               ]
              }
             },
             {name: 'status', selector: ['fields','status'],
              config:
              {fields:
               [{name: 'name'},
                {name: 'iconUrl'},
                {name: 'category', selector: 'statusCategory',
                 config:
                 {fields: [{name: 'colorName'},
                           {name: 'name'}]}
                }
               ]
              }
             },
             {name: 'estimatedSeconds', selector: ['fields','aggregatetimeoriginalestimate']},
             {name: 'linkedIssues', selector: ['fields','issuelinks'],
              config:
              {fields:
               [{name: 'relation',
                 selector: ['type','outward']
                },
                {name: 'relatedIssueKey',
                 selector: ['outwardIssue','key']
                },
                {name: 'relatedIssueKey',
                 selector: ['inwardIssue','key']
                }
               ]
              }
             }
            ]
          };

    const config =
          {wrapper: TriangleLayerItem,
           fields:
           [{name: 'startDate',
             selector: ['fields','sprint','startDate'],
             wrapper: Date
            },
            {name: 'endDate',
             selector: ['fields','sprint','endDate'],
             wrapper: Date
            },
            {name: 'name',
             selector: ['fields','summary'],
             mapper: R.trim
            },
            {name: 'description',
             selector: ['fields','description']
            },
            {name: 'updateStatusType', defValue: 0},
            {name: 'updateFrequency', defValue: 0},
            {name: 'userId', defValue: 0},
            {name: 'groupId', defValue: 0},
            {name: 'organizationId', defValue: 0},
            {name: 'activeStatusType', defValue: 1}, // looks like 1 means active
            {name: 'creatorId', defValue: 0},
            {name: 'jiraIssue', config: jiraIssueConfig},
            {name: 'createdAt',
             selector: ['fields','created'],
             wrapper: Date
            },
            {name: 'watchers', defValue: []},
            {name: 'assignments', defValue: []},
            {name: 'dependencies', defValue: []}
           ]
          };

    const transformer = new Transformer(config);
    const data =
          JSON.parse(readFileSync('test/data/AWIZ-1543.json').toString());
    const ret = transformer.transform(data);
    expect(isRight(ret)).to.be.true;
    const out = right(ret);
    expect(out instanceof TriangleLayerItem).to.be.true;
    expect(out.startDate instanceof Date).to.be.true;
    expect(out.startDate.getTime()).to.equal(new Date('2017-04-10T09:46:54.050-07:00').getTime());

    expect(out.endDate instanceof Date).to.be.true;
    expect(out.endDate.getTime()).to.equal(new Date('2017-04-23T09:46:00.000-07:00',).getTime());

    expect(out.name).to.equal('Custom AT Fields');
    expect(out.description).to.equal('This is a requirement');
    expect(out.updateStatusType).to.equal(0);
    expect(out.updateFrequency).to.equal(0);
    expect(out.userId).to.equal(0);
    expect(out.groupId).to.equal(0);
    expect(out.organizationId).to.equal(0);
    expect(out.activeStatusType).to.equal(1);
    expect(out.creatorId).to.equal(0);
    expect(out.jiraIssue).to.not.be.null;
    expect(out.jiraIssue.id).to.equal(31113);
    expect(out.jiraIssue.key).to.equal('AWIZ-1543');
    expect(out.jiraIssue.labels).to.eql(['some-label']);
    expect(out.jiraIssue.projectId).to.equal(10018);
    expect(out.jiraIssue.urlPrefix).to.equal('https://crosslead.atlassian.net/browse/');
    expect(out.jiraIssue.issueType).to.not.be.undefined;
    expect(out.jiraIssue.issueType.name).to.equal('Epic');
    expect(out.jiraIssue.issueType.iconUrl).to.equal('https://crosslead.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10307&avatarType=issuetype');
    expect(out.jiraIssue.priority).not.to.be.undefined;
    expect(out.jiraIssue.priority.name).to.equal('Medium');
    expect(out.jiraIssue.priority.iconUrl).to.equal('https://crosslead.atlassian.net/images/icons/priorities/medium.svg');
    expect(out.jiraIssue.status.name).to.equal('Resolved');
    expect(out.jiraIssue.status.iconUrl).to.equal('https://crosslead.atlassian.net/images/icons/statuses/resolved.png');
    expect(out.jiraIssue.status.category).to.not.be.undefined;
    expect(out.jiraIssue.status.category.colorName).to.equal('green');
    expect(out.jiraIssue.status.category.name).to.equal('Done');
    expect(out.jiraIssue.estimatedSeconds).to.equal(288000);
    expect(out.jiraIssue.linkedIssues).to.be.instanceof(Array);

    expect(out.jiraIssue.linkedIssues[0].relation).to.equal('blocks');
    expect(out.jiraIssue.linkedIssues[0].relatedIssueKey).to.equal('AWIZ-1510');
    expect(out.jiraIssue.linkedIssues[1].relation).to.equal('relates to');
    expect(out.jiraIssue.linkedIssues[1].relatedIssueKey).to.equal('AWIZ-1510');
    expect(out.jiraIssue.linkedIssues[2].relation).to.equal('relates to');
    expect(out.jiraIssue.linkedIssues[2].relatedIssueKey).to.equal('CG-1526');
    expect(out.jiraIssue.linkedIssues[3].relation).to.equal('relates to');
    expect(out.jiraIssue.linkedIssues[3].relatedIssueKey).to.equal('PROF-183');
    expect(out.createdAt.getTime()).to.equal(new Date('2017-03-09T06:51:59.856-0800').getTime());
    expect(out.watchers).to.be.instanceof(Array);
    expect(out.assignments).to.be.instanceof(Array);
    expect(out.dependencies).to.be.instanceof(Array);

    expect(out.$orig).to.be.undefined;
    expect(out.id_).to.be.undefined;
  });
});

