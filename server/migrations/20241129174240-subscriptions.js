const { ObjectId } = require('mongodb');

module.exports = {
  async up(db, client) {
    // Define the records to be added
    const records = [
      { 
        name: 'Basic', 
        price: '4.99', 
        currency: 'gbp', 
        features: [
          {
            _id: new ObjectId(),
            name: '3 Active Pods per Month',
            system: 'pods',
            value: 3
          },
          {
            _id: new ObjectId(),
            name: '5 Members per Pod',
            system: 'members',
            value: 5
          },
          {
            _id: new ObjectId(),
            name: '3 Active Pods member per Month',
            system: 'pods-member',
            value: 3
          },
          {
            _id: new ObjectId(),
            name: '500 Min Amount per pod',
            system: 'pod-min-amount',
            value: 500
          },
          {
            _id: new ObjectId(),
            name: '3000 Max Amount per pod',
            system: 'pod-max-amount',
            value: 3000
          }
        ],
        active: true
      },
      { 
        name: 'Pro', 
        price: '9.99', 
        currency: 'gbp', 
        features: [
          {
            _id: new ObjectId(),
            name: '8 Active Pods per Month',
            system: 'pods',
            value: 8
          },
          {
            _id: new ObjectId(),
            name: '12 Members per Pod',
            system: 'members',
            value: 12
          },
          {
            _id: new ObjectId(),
            name: '8 Active Pods member per Month',
            system: 'pods-member',
            value: 8
          },
          {
            _id: new ObjectId(),
            name: '3200 Min Amount per pod',
            system: 'pod-min-amount',
            value: 3200
          },
          {
            _id: new ObjectId(),
            name: '10,000 Max Amount per pod',
            system: 'pod-max-amount',
            value: 10000
          }
        ],
        active: true 
      },
    ];

    // Insert records into the collection
    await db.collection('subscriptions').insertMany(records);
  },

  async down(db, client) {
    // Define the names of the records to be removed (or use other criteria)
    const recordNames = ['Basic', 'Pro'];

    // Remove the inserted records
    await db.collection('subscriptions').deleteMany({ name: { $in: recordNames } });
  },
};
