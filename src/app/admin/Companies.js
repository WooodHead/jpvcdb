import * as React from 'react'
import Link from 'next/link'
import { Layout, Breadcrumb, Button, Table, Tabs, Card, Form, Input, Upload, Modal, Select, Icon, Tag, message, notification } from 'antd';
import styled from 'styled-components';
import FirebaseProvider from '../lib/FirebaseProvider';
import createCompany from '../lib/createCompany'
import firebaseManager from '../lib/firebaseManager'

const { Content } = Layout;
const FormItem  = Form.Item;
const TabPane = Tabs.TabPane;

class PhotoUpload extends React.Component {
  static getDerivedStateFromProps(nextProps) {
    // Should be a controlled component.
    if ('value' in nextProps) {
      return {
        ...(nextProps.value || {}),
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    // console.log(`PhotoUpload, props: ${JSON.stringify(props)}`)

    const value = props.value || {};
    const fileList = props.url ? [{uid: '-1', name: 'image.png', status: 'done', url: props.url}] : []
    this.state = {
      previewVisible: false,
      previewImage: '',
      fileList: fileList,
      file: value.file,
      percent: 0,
      };
  }

  beforeUpload = (file) => {
    this.setState({ file })
    this.triggerChange({ file });
    return true
  }

  triggerChange = (changedValue) => {
    // Should provide an event to pass value to Form.
    const onChange = this.props.onChange;
    if (onChange) {
      console.log(`triggerChange: ${JSON.stringify(changedValue)}`)
      // onChange(Object.assign({}, this.state, changedValue));
      onChange(changedValue);
    }
  }

  normFile = (e) => {
    console.log('Upload event:', e);
    if (Array.isArray(e)) {
      return e;
    }
    return e && e.fileList;
  }

  handlePreview = (file) => {
    this.setState({
      previewImage: file.url || file.thumbUrl,
      previewVisible: true,
    });
  }

  handleCancelPreview = () => this.setState({ previewVisible: false })

  handleChange = ({ fileList }) => {
    this.setState({ fileList });
    if (fileList.length == 0) {
      this.triggerChange({ file: null });
    }
  };

  render() {
    const { size } = this.props;
    const { previewVisible, previewImage, fileList } = this.state;
    const uploadButton = (
      <div>
        <Icon type="plus" />
        <div className="ant-upload-text">Upload</div>
      </div>
    );

    return (
      <div>
        <Upload
        listType="picture-card"
        fileList={fileList}
        onPreview={this.handlePreview}
        onChange={this.handleChange}
        beforeUpload={this.beforeUpload}
        >
        {fileList.length >= 1 ? null : uploadButton}
        </Upload>
        <Modal visible={previewVisible} footer={null} onCancel={this.handleCancelPreview}>
        <img alt="example" style={{ width: '100%' }} src={previewImage} />
        </Modal>
      </div>
    );
  }
}


class CompanyCreate extends React.Component {
  state = {
    cancelCallback: this.props.cancelCallback,
    deploying: false,
    menuVisible: false,
    loading: false,
    percent: 0
  }

  handleOk = () => {
    this.setState({
      menuVisible: false,
    });
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const {history} = this.props;
    this.props.form.validateFields((err, values) => {
      if (!err) {
        console.log("handleSubmit values:", JSON.stringify(values))

        var promises = []

        let landingFile = values.landingpage

        var hide = message.loading(`Loading... ${landingFile.name || landingFile}`, this.state.percent);

        if (typeof(landingFile) === "string") { 
          promises.push( Promise.resolve(landingFile) )
        }
        else {
          // Note the validateFields values for uploads returns an rc-upload object, https://www.npmjs.com/package/rc-upload
          // The JS File object is therefore landingFile.file
          let uploadLanding = firebaseManager.sharedInstance.uploadFile(landingFile.file,'landingpage.png',this.uploadProgress)
          promises.push( uploadLanding )
        }

        let iconFile = values.icon

        var hide2 = message.loading(`Loading icon... ${iconFile.name || iconFile}`, this.state.percent);

        if (typeof(iconFile) === "string") {  
          promises.push( Promise.resolve(iconFile) )
        }
        else {
          // Note the validateFields values for uploads returns an rc-upload object, https://www.npmjs.com/package/rc-upload
          // The JS File object is therefore iconFile.file
          let uploadIcon = firebaseManager.sharedInstance.uploadFile(iconFile.file,'icon.png',this.uploadProgress)
          promises.push( uploadIcon )
        }

        Promise.all(promises)
        .then((result) => {
          console.log("uploadFile result", result)

          values.landingpage = result[0]
          values.icon = result[1]
          values.logo = result[1]

          hide()
          hide2()

          return createCompany(values)
        })
        .then( (resp) => {

          if (resp) {
            notification.info({
                message: "Company Created!",
                description: `Thank you ${values.name}. We crteated a new company.`
            })

          this.props.form.resetFields()

          this.state.cancelCallback && this.state.cancelCallback()

          }
        })
        .catch( err => {
          var errorCode = err.code || 'Sorry, there was a problem.';
          var errorMessage = err.message || 'Please correct the errors and submit again'
  
          notification.error({
            message: errorCode,
            description: errorMessage
          })

          console.log(`Error saving company: ${errorMessage}`);

        })


      }
      else {
        var errorCode = err.code || 'Sorry, there was a problem.';
        var errorMessage = err.message || 'Please correct the errors and submit again'

        notification.error({
          message: errorCode,
          description: errorMessage
        })
      }
    })
  }

  normFile = (e) => {
    console.log('Upload event:', e);
    if (Array.isArray(e)) {
      return e;
    }
    return e && e.fileList;
  }

  uploadProgress = (percent,task) => {
    console.log(`uploadProgress: progress = ${percent}`)
    this.setState({ percent })
  }

  // Testing validation
  validateUpload = (rule, value, callback) => {
    console.log(`validateUpload: ${JSON.stringify(value)}`)
    if (true) {   //(value && value.file) {
      callback();
      return;
    }

    callback && callback('Need to add image')
  }

  onChangeIcon = value => { console.log(`changeIcon: ${JSON.stringify(value)}`)}

  render() {
    const { getFieldDecorator } = this.props.form;
    const { deploying, loading } = this.state;
    const uploadButton = (
      <div>
        <Icon type="plus" />
        <div className="ant-upload-text">Upload</div>
      </div>
    );

    return (
      <Content>
        <Button key="back" size="large" icon="arrow-left" onClick={this.props.cancelCallback} style={{ marginBottom: 16}} >Cancel</Button>

        <div style={{ padding: 0, background: '#fff', minHeight: 360 }}>
        <Card title="New Company" bordered={false} style={{ width: "100%"}} loading={false} >
            <Form onSubmit={this.handleSubmit}>
            <Tabs defaultActiveKey="1" >
                    <TabPane tab="Info" key="1">

                        <FormItem label="Name">
                        {getFieldDecorator('name', {
                            rules: [{ required: true, message: 'Please input a name!' }],
                        })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder=" New Company" />
                        )}
                        </FormItem>

                        <FormItem label="Description">
                        {getFieldDecorator('description', {
                            rules: [{ required: true, message: 'Please input your description!' }],
                        })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} type="text" placeholder=" Description..." />
                        )}
                        </FormItem>

                        <FormItem label="Batch">
                        {getFieldDecorator('batch', {
                            rules: [{ required: true, message: 'Please input your batch!' }],
                        })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} type="text" placeholder=" Batch" />
                        )}
                        </FormItem>

                        <FormItem label="Category">
                        {getFieldDecorator('category', {
                            rules: [{ required: true, message: 'Please input your category!' }],
                            initialValue: 'Other SaaS',

                        })(
                          <Select style={{ width: 150 }}>
                            <Option value="Aerospace" icon="rocket" >Aerospace</Option>
                            <Option value="Agriculture" icon="compass" >Agriculture</Option>
                            <Option value="AI and ML" icon="setting" >AI and ML</Option>
                            <Option value="Blockchain" icon="link" >Blockchain</Option>
                            <Option value="Consumer" icon="user" >Consumer</Option>
                            <Option value="Dev Tools" icon="tool" >Dev Tools</Option>
                            <Option value="Education" icon="edit" >Education</Option>
                            <Option value="Entertainment" icon="video-camera" >Entertainment</Option>
                            <Option value="Fintech" icon="bank" >Fintech</Option>
                            <Option value="Government" icon="pound" >Government</Option>
                            <Option value="Healthcare" icon="medicine-box" >Healthcare</Option>
                            <Option value="Industrial" icon="experiment" >Industrial</Option>
                            <Option value="Real Estate" icon="shop" >Real Estate</Option>
                            <Option value="Resources" icon="crown" >Resources</Option>
                            <Option value="Transport" icon="car" >Transport</Option>
                            <Option value="Other SaaS" icon="cloud" >Other SaaS</Option>
                            <Option value="Nonprofit" icon="team" >Nonprofit</Option>                          
                          </Select>

                        )}
                        </FormItem>


                        <FormItem label="Status">
                        {getFieldDecorator('status', {
                            rules: [{ required: true, message: 'Please input company status!' }],
                            initialValue: 'Live',

                        })(
                          <Select style={{ width: 150 }}>
                            <Option value="Live" icon="rocket" >Live</Option>
                            <Option value="Dead" icon="compass" >Dead</Option>
                            <Option value="Exited" icon="setting" >Exited</Option>                          
                          </Select>

                        )}
                        </FormItem>


                    </TabPane>
                    <TabPane tab="Performance" key="2">


                        <FormItem label="Funding">
                        {getFieldDecorator('funding', {
                              initialValue: 0
                          })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder=" Funding" />
                        )}
                        </FormItem>

                        <FormItem label="Exit">
                        {getFieldDecorator('exit', {
                              initialValue: 0
                          })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder=" Exit" />
                        )}
                        </FormItem>

                        <FormItem label="Employees">
                        {getFieldDecorator('employees', {
                              initialValue: 1
                          })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder=" Employees" />
                        )}
                        </FormItem>

                    </TabPane>
                    <TabPane tab="Address" key="3">


                        <FormItem label="Address">
                        {getFieldDecorator('address', {
                              initialValue: ""
                          })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder=" Address" />
                        )}
                        </FormItem>

                        <FormItem label="Website">
                        {getFieldDecorator('www', {
                              initialValue: 'http://'
                          })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder=" Website" />
                        )}
                        </FormItem>

                        <FormItem label="HQ Location">
                        {getFieldDecorator('hqLocation', {
                              initialValue: ''
                          })(
                            <Input prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="  Location" />
                        )}
                        </FormItem>

                    </TabPane>

                    <TabPane tab="Design" key="4">


                        <FormItem label="Landingpage">

                        {getFieldDecorator('landingpage', {
                            valuePropName: 'url',
                            // getValueFromEvent: this.normFile,
                            initialValue: { file: null },
                            rules: [{ validator: this.validateUpload }]
                            })( <PhotoUpload  /> )}


                        </FormItem>

                        <FormItem label="Icon">

                          {getFieldDecorator('icon', {
                            valuePropName: 'url',
                            // getValueFromEvent: this.normFile,
                            initialValue: { file: null },
                            rules: [{ validator: this.validateUpload }]
                            })( <PhotoUpload onChange={this.onChangeIcon}/> )}

                        </FormItem>

                    </TabPane>
                  </Tabs>

                <FormItem>
                    <Button type="primary" htmlType="submit" style={{ marginTop: 16}} >
                    Save
                    </Button>
                </FormItem>
                
              </Form>
          </Card>
        </div>
      </Content>
      )
  }
}

export default class MFCompanies extends React.Component {
  state = {
    deploying: false,
    menuVisible: false,
    loading: false,
    limit: 10,
    fields: {}    // Form props, same as record
  }

  handleLoadMore = () => {
    this.setState({
      limit: this.state.limit + 10
    })
  }

  handleShowMenu = () => {
    this.setState({
      menuVisible: true,
    });
  }

  handleHideMenu = () => {
    this.setState({
      menuVisible: false,
    });
  }

  handleOk = () => {
    this.setState({
      menuVisible: false,
    });
  }

  onEdit = record => {
    this.setState({
      fields: record,
      menuVisible: true
    })
  }

  onRowSelect = record => {
    // console.log("Select record ", record)
    this.onEdit(record)
  }
  render() {
    const { deploying, loading, limit, fields } = this.state;
    const WrappedCompanyCreate = Form.create({mapPropsToFields(props) {
      return {
        name: Form.createFormField({ value: props.name }),
        description: Form.createFormField({ value: props.description }),
        batch: Form.createFormField({ value: props.batch }),
        category: Form.createFormField({ value: props.category }),
        status: Form.createFormField({ value: props.status }),
        funding: Form.createFormField({ value: props.funding }),
        exit: Form.createFormField({ value: props.exit }),
        employees: Form.createFormField({ value: props.employees }),
        address: Form.createFormField({ value: props.address }),
        www: Form.createFormField({ value: props.www }),
        hqLocation: Form.createFormField({ value: props.hqLocation }),
        landingpage: Form.createFormField({ value: props.landingpage }),
        icon: Form.createFormField({ value: props.logo}),
      };
    }})(CompanyCreate);

    const colorForStatus = status => {
      if (status.match(/live/i)) return "#ffc108" // yellow
      if (status.match(/dead/i)) return "#dc3545" // red
      if (status.match(/exit/i)) return "#28a745"  // green
      return "gray"
  }

    const columns = [{
      title: 'Name',
      dataIndex: 'id',
      key: 'id',
      // render: ((text) => <a href={text} target="_blank" rel="noopener noreferrer">{text}</a>),
    }, {
      title: 'Batch',
      dataIndex: 'batch',
      key: 'batch',
    }, {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: ((tag) => <Tag color={colorForStatus(tag)} key={tag} >{tag.toUpperCase()}</Tag>)
    }, {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    }, {
      title: 'Actions',
      // dataIndex: 'databaseURL',
      key: 'edit',
      render: ((text,record) => <Button.Group type="small" ><Button icon="edit" onClick={ () => this.onEdit(record) }/><Button icon="delete" /></Button.Group> ),
  }];

    return (
      <Content style={{ margin: '0 16px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Home</Breadcrumb.Item>
        <Breadcrumb.Item>Company</Breadcrumb.Item>
        {this.state.menuVisible ?
        <Breadcrumb.Item>{this.state.fields.id ? `Edit` : `Create`}</Breadcrumb.Item>
        : null
        }
        </Breadcrumb>
        
        {this.state.menuVisible ?
         <WrappedCompanyCreate {...fields} cancelCallback={this.handleHideMenu} />
        :
        <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>
        
          <div style={{textAlign: 'right'}} >
          <Button type="secondary" size="large" icon="plus" onClick={this.handleShowMenu}> New Company </Button>
          </div>
          <br />
          
          <FirebaseProvider path={'companies'} limit={limit} >

          { ({error, isLoading, data}) => {
          
            if (error) { console.error("Error loading users ", error)}

            return(
                <Table 
                columns={columns} 
                dataSource={data} 
                rowKey={record => record.id}
                onRow={(record) => ({
                  onClick: () => { this.onRowSelect(record); }
                })}
                loading={isLoading} 
                pagination={true} />
            )
          }}

          </FirebaseProvider>
          
          <div style={{textAlign: 'right'}} >
          <Button type="secondary" size="small" icon="plus" onClick={this.handleLoadMore}> Load More </Button>
          </div>

        </div>
        }
      </Content>
      )

  }

}