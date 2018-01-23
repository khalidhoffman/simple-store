import {get, last, find} from 'lodash';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/debounce';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/combineLatest';

export interface StoreState {
	[key: string]: any
}

export interface StoreSubscription extends Subscription {
	callback: (value: any) => any
}

export interface PathStoreSubscription extends StoreSubscription {
	path: string
}

export interface StoreSubscriptionIndex {
	[path: string]: StoreSubscription[]
}

export default class Store {
	private _state: any = {};
	private pathIndex: StoreSubscriptionIndex = {};
	private observable: BehaviorSubject<any>;

	set state(value: any) {
		this._state = Object.assign({}, this._state, value);
		this.observable.next(this._state);
	}

	get state(): any {
		return this._state;
	}

	constructor(defaultState = {}) {
		if (defaultState) {
			this._state = defaultState;
		}
		this.observable = new BehaviorSubject(this._state);
	}

	private removePathIndex(path: string, index: number): { removed: number } {
		return {removed: this.pathIndex[path].splice(index, 1).length};
	}

	private injectState(fn: (value: any) => any): () => any {
		const state = this.state;
		const _state = this._state;
		return function (): any {
			return fn.apply(Object.assign(this, {state, _state}), arguments);
		};
	}

	private wrapUnsubscribe(subscription: PathStoreSubscription): PathStoreSubscription {
		let subscriptionIdx: number;

		if (this.pathIndex[subscription.path]) {
			subscriptionIdx = this.pathIndex[subscription.path].indexOf(subscription);
		} else {
			subscriptionIdx = 0;
		}

		if (subscriptionIdx < 0) {
			console.warn('could not find subscription');
			return subscription;
		}

		const unsubscribeFn = subscription.unsubscribe;
		const self = this;
		subscription.unsubscribe = function (...args: any[]): void {
			self.removePathIndex(subscription.path, subscriptionIdx);
			return unsubscribeFn.apply(this, args);
		};

		return subscription;
	}

	public update(state: StoreState): void {
		this.state = state;
	}

	public getState(): StoreState {
		return this.state;
	}

	public get(path: string, fallback?: any): any {
		return get(this._state, path, fallback);
	}

	public subscribe(callback: () => any): StoreSubscription {
		return Object.assign(this.observable.subscribe({next: this.injectState(callback)}), {callback});
	}

	/**
	 * @description Passes the changed value on _state changes
	 */
	public on(path: string, callback: (value: any) => any): StoreSubscription {
		const _subscription = this.getObservable(path).subscribe({next: this.injectState(callback)});
		const subscription: StoreSubscription = this.wrapUnsubscribe(Object.assign(_subscription, {path, callback}));

		this.pathIndex[path] = this.pathIndex[path] || [];
		this.pathIndex[path].push(subscription);

		return last(this.pathIndex[path]);
	}

	public off(path: string, callback: (value: any) => any): Subscription[] {
		const subscription = find(this.pathIndex[path], {callback});
		const subscriptionIdx = this.pathIndex[path].indexOf(subscription);
		const removedSubscriptions = subscriptionIdx < 0 ?  [] : this.pathIndex[path].splice(subscriptionIdx, 1);

		if (removedSubscriptions.length === 0) {
			console.warn('could not find subscription');
			return removedSubscriptions;
		}

		removedSubscriptions.forEach(observable => observable.unsubscribe());
		return removedSubscriptions;
	}

	/**
	 * @description Passes the entire _state on _state changes
	 */
	public watch(path: string, callback: (value: StoreState) => any): StoreSubscription {
		const subscription = this.getStateObservable(path).subscribe({next: this.injectState(callback)});
		return Object.assign(subscription, {path, callback});
	}

	public getStateObservable(path: string): Observable<StoreState> {
		if (path) {
			return this.observable.distinctUntilChanged((prev: StoreState, current: StoreState) => {
				return Store.compare(prev, current, path);
			});
		} else {
			return this.observable;
		}
	}

	public getObservable(path: string): Observable<StoreState> {
		return this.getStateObservable(path).map(_state => get(_state, path));
	}

	private static compare(preVal: StoreState, newVal: StoreState, path: string): boolean {
		return get(newVal, path) === get(preVal, path);
	}
}
