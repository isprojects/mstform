import React, { Component } from "react";
import "antd/dist/antd.css";
import { Button, Form, Input, Card } from "antd";
import { types } from "mobx-state-tree";
import { Form as MstForm, Field } from "mstform";

const M = types.model("M", {
  foo: types.string
});

const form = new MstForm(M, {
  foo: new Field({
    validators: [value => value !== "correct" && "Wrong"]
  })
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

class App extends Component {
  constructor(props) {
    super(props);
    this.node = M.create({ foo: "FOO" });
    this.state = form.create(this.node);
  }

  render() {
    return (
      <Card>
        <Form>
          <Form.Item label="foo" {...formItemLayout}>
            <Input />
          </Form.Item>
        </Form>
        <Button>press</Button>
      </Card>
    );
  }
}

export default App;
