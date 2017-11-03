import {get, last} from 'lodash';
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
	path: string
}

export interface StorePathSubscription {
	callbacks: Array<() => any>
	subscriptions: StoreSubscription[]
}

export interface StorePathSubscriptionCache {
	[path: string]: StorePathSubscription
}

export default class Store {
	private _state: any = {};
	private indexes: StorePathSubscriptionCache = {};
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

	private removePathIndex(path: string, index: number): { callbacks: number, subscriptions: number } {
		const removedSubscriptions: Subscription[] = this.indexes[path].subscriptions.splice(index, 1);
		const removedCallbacks: Array<() => any> = this.indexes[path].callbacks.splice(index, 1);
		return {callbacks: removedCallbacks.length, subscriptions: removedSubscriptions.length};
	}

	private injectState(fn: () => any): () => any {
		const state = this.state;
		const _state = this._state;
		return function (): any {
			return fn.apply(Object.assign(this, {state, _state}), arguments);
		};
	}

	private wrapUnsubscribe(subscription: StoreSubscription): StoreSubscription {
		let subscriptionIdx: number;

		if (this.indexes[subscription.path]) {
			subscriptionIdx = this.indexes[subscription.path].subscriptions.indexOf(subscription);
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

	public subscribe(callback: () => any): Subscription {
		return this.observable.subscribe({next: this.injectState(callback)});
	}

	/**
	 * @description Passes the changed value on _state changes
	 */
	public on(path: string, callback: () => any): StoreSubscription {
		const _subscription = this.getObservable(path).subscribe({next: this.injectState(callback)});
		const subscription: StoreSubscription = this.wrapUnsubscribe(Object.assign(_subscription, {path}));

		this.indexes[path] = this.indexes[path] || {callbacks: [], subscriptions: []};
		this.indexes[path].callbacks.push(callback);
		this.indexes[path].subscriptions.push(subscription);

		return last(this.indexes[path].subscriptions);
	}

	public off(path: string, callback: () => any): Subscription[] {
		const callbackIdx = this.indexes[path].callbacks.indexOf(callback);
		let removedSubscriptions;

		if (callbackIdx < 0) {
			console.warn('could not find subscription');
			return [];
		}

		this.indexes[path].callbacks.splice(callbackIdx, 1);
		removedSubscriptions = this.indexes[path].subscriptions.splice(callbackIdx, 1);
		removedSubscriptions.forEach(observable => observable.unsubscribe());
		return removedSubscriptions;
	}

	/**
	 * @description Passes the entire _state on _state changes
	 */
	public watch(path: string, callback: (value: StoreState) => void): StoreSubscription {
		return Object.assign(this.getStateObservable(path).subscribe({next: callback}), {path});
	}

	public getStateObservable(path: string): Observable<StoreState> {
		if (path) {
			return this.observable.distinctUntilChanged((prev, current) => Store.compare(prev, current, path));
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
