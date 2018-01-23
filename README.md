# SimpleStore

## API

method                              | description
------------------------------------|----------------------------------
`getObservable(path: string)`       | returns an observable that emits the entire state when the path has been modified
`getStateObservable(path: string)`  | returns an observable that emits the modified state slice when the path has been modified
`on(path: string, callback)`        | similar to jQuery - executes callback by passing changed value at path when modified. Returns a `Subscription`
`off(path: string, callback)`       | similar to jQuery - unsubscribes callback from path
`watch(path: string, callback)`     | executes callback by passing entire state when path has been modified. Returns a `Subscription`
`subscribe(path: string, callback)` | executes callback by passing entire state when the state has been touched. Returns a `Subscription`
`update(state: any)`                | similar to React's `updateState` - merges argument with current state
`getState(state: any)`              | returns current state as-is
`get(state: any)`                   | returns current value in state at path

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