import React, { Component } from "react";
import "antd/dist/antd.css";
import { observer } from "mobx-react";
import { Button, Form, Input, Card } from "antd";
import { types } from "mobx-state-tree";
import { Form as MstForm, Field, RepeatingForm } from "mstform";

const N = types.model("N", {
  qux: types.string
});

const M = types.model("M", {
  foo: types.string,
  bar: types.array(N)
});

const form = new MstForm(M, {
  foo: new Field({
    validators: [value => value !== "correct" && "Wrong"],
    getRaw: ev => ev.target.value
  }),
  bar: new RepeatingForm({ qux: new Field({ getRaw: ev => ev.target.value }) })
});

const formItemLayout = {
  labelCol: {
    xs: { span: 10 },
    sm: { span: 1 }
  },
  wrapperCol: {
    xs: { span: 10 },
    sm: { span: 10 }
  }
};

@observer
class App extends Component {
  constructor(props) {
    super(props);
    this.node = M.create({ foo: "FOO", bar: [] });
    this.state = form.create(this.node);
  }

  handleAdd = ev => {
    const barRepeating = this.state.repeatingForm("bar");
    barRepeating.push({ qux: "NEW" });
  };

  render() {
    const fooField = this.state.field("foo");
    const barRepeating = this.state.repeatingForm("bar");
    const entries = this.node.bar.map((entry, index) => {
      const quxField = barRepeating.index(index).field("qux");
      return (
        <Card key={index}>
          <Form.Item
            label="Foo"
            {...quxField.validationProps}
            {...formItemLayout}
          >
            <Input {...quxField.inputProps} />
          </Form.Item>
        </Card>
      );
    });
    return (
      <Card>
        <Form>
          <Form.Item
            label="Foo"
            {...fooField.validationProps}
            {...formItemLayout}
          >
            <Input {...fooField.inputProps} />
          </Form.Item>
          {entries}
        </Form>
        <Button onClick={this.handleAdd}>Add</Button>
        <Button>press</Button>
      </Card>
    );
  }
}

export default App;
