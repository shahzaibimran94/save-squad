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
            name: '3x Pods'
          },
          {
            _id: new ObjectId(),
            name: '5x Members per pod'
          },
          {
            _id: new ObjectId(),
            name: '3000 Max pod amount'
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
            name: '8x Pods'
          },
          {
            _id: new ObjectId(),
            name: '15x Members per pod'
          },
          {
            _id: new ObjectId(),
            name: '10,000 Max pod amount'
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
