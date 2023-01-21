import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';
import { BiowcPathwaygraph } from '../src/BiowcPathwaygraph.js';
import '../src/biowc-pathwaygraph.js';

describe('BiowcPathwaygraph', () => {
  it('has a default mytitle "Hey there" and counter 5', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html`<biowc-pathwaygraph></biowc-pathwaygraph>`
    );

    expect(el.mytitle).to.equal('Hey there');
    expect(el.counter).to.equal(5);
  });

  it('increases the counter on button click', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html`<biowc-pathwaygraph></biowc-pathwaygraph>`
    );
    el.shadowRoot!.querySelector('button')!.click();

    expect(el.counter).to.equal(6);
  });

  it('can override the mytitle via attribute', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html`<biowc-pathwaygraph
        mytitle="attribute mytitle"
      ></biowc-pathwaygraph>`
    );

    expect(el.mytitle).to.equal('attribute mytitle');
  });

  it('passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html`<biowc-pathwaygraph></biowc-pathwaygraph>`
    );

    await expect(el).shadowDom.to.be.accessible();
  });
});
