# SimpleStore

## How to use?
Some example usage... (more can be found in the [test/store.spec.js](./test/store.spec.js))
```javascript
const defaultState = {
    nested: {val: 'sameValue'},
    another: 'anotherValue'
};
const store = new SimpleStore(defaultState);
let callbackCount = 0;

const subscription = store.on('nested.val', function () {
    callbackCount++;
});

// callback gets executed once on first subscription
expect(callbackCount).to.eql(1);

store.update({nested: {val: 'sameValue'}});
expect(callbackCount).to.eql(1);
store.update({nested: {val: 'sameValue'}});
expect(callbackCount).to.eql(1);

store.update({another: 'anotherChangedValue'});
expect(callbackCount).to.eql(1);
// we're not subscribed to `another` 
// so we have no callback execution
store.update({another: 'anotherChangedAgainValue'});
expect(callbackCount).to.eql(1);

store.update({nested: {val: 'newValue'}});
// value change
expect(callbackCount).to.eql(2);

store.update({nested: {val: 'newValue'}});
// value did not change despite calling update, so no callback
expect(callbackCount).to.eql(2);

subscription.unsubscribe();
expect(callbackCount).to.eql(2);
```