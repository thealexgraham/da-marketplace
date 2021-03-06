import React from 'react'
import { Grid } from 'semantic-ui-react'

import SideMenu from './SideMenu'
import TopMenu from './TopMenu'

import './Page.css'

type Props = {
    menuTitle?: React.ReactElement;
    sideNav: React.ReactElement;
    notifications?: React.ReactElement[];
    onLogout: () => void;
    isLandingPage?: boolean;
}

const Page: React.FC<Props> = ({ children, menuTitle, sideNav, notifications, onLogout, isLandingPage }) => {
    return (
        <Grid className='page-content'>
            <SideMenu>{ sideNav }</SideMenu>
            <Grid.Column className='page-body'>
                <TopMenu onLogout={onLogout} title={menuTitle} notifications={notifications} isLandingPage={isLandingPage}/>
                { children }
            </Grid.Column>
        </Grid>
    )
}

export default Page
