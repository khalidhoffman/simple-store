const {expect} = require('chai');

const {default: SimpleStore} = require('../store');

describe('SimpleStore', function () {

    describe('update()', function () {
        it('updates the state of the store', function () {
            const store = new SimpleStore();
            const testValues = {
                test: 'values',
                another: 'testValue'
            };
            store.update(testValues);
            store.update({moreValues: true});

            expect(store.state).to.include(testValues);
        });
    });

    describe('get()', function () {
        it('retrieves a value at the specified path', function () {
            const fallback = "it's okay";
            const testValues = {
                nested: {parent: {obj: 'val'}},
                arrayVals: ['a', 'b', 'c']
            };
            const store = new SimpleStore(testValues);

            expect(store.get('nested.parent.obj')).to.eql(testValues.nested.parent.obj);
            expect(store.get('nested.wrong.parent.obj', fallback)).to.eql(fallback);
            expect(store.get('arrayVals[1]', fallback)).to.eql(testValues.arrayVals[1]);
        });
    });

    describe('on()', function () {

        it('only fires when the specified path is changed', function () {
            const defaultState = {
                nested: {val: 'firstValue'},
                another: 'anotherValue'
            };
            const store = new SimpleStore(defaultState);
            let callbackCount = 0;

            store.update({nested: {val: 'sameValue'}});
            expect(callbackCount).to.eql(0);

            const subscription = store.on('nested.val', function () {
                callbackCount++;
            });
            expect(callbackCount).to.eql(1);

            store.update({nested: {val: 'sameValue'}});
            expect(callbackCount).to.eql(1);
            store.update({nested: {val: 'sameValue'}});
            expect(callbackCount).to.eql(1);

            store.update({another: 'anotherChangedValue'});
            expect(callbackCount).to.eql(1);
            store.update({another: 'anotherChangedAgainValue'});
            expect(callbackCount).to.eql(1);

            store.update({nested: {val: 'newValue'}});
            expect(callbackCount).to.eql(2);
            store.update({nested: {val: 'newValue'}});
            expect(callbackCount).to.eql(2);

            store.update({nested: {val: 'anotherNewValue'}});
            expect(callbackCount).to.eql(3);
            store.update({nested: {val: 'anotherNewValue'}});
            expect(callbackCount).to.eql(3);

            subscription.unsubscribe();
            expect(callbackCount).to.eql(3);
            store.update({nested: {val: 'anotherPostNewValue'}});
            store.update({nested: {val: 'anotherPostNewValue'}});
            expect(callbackCount).to.eql(3);

        });
    });
});