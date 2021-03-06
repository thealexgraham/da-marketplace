import React, { useEffect, useState } from 'react'
import { Switch, Route, useRouteMatch } from 'react-router-dom'

import { useLedger, useParty, useStreamQueries } from '@daml/react'
import { AssetDeposit } from '@daml.js/da-marketplace/lib/DA/Finance/Asset'
import { ExchangeParticipant } from '@daml.js/da-marketplace/lib/Marketplace/ExchangeParticipant'
import { RegisteredBroker } from '@daml.js/da-marketplace/lib/Marketplace/Registry'
import { BrokerInvitation } from '@daml.js/da-marketplace/lib/Marketplace/Broker'
import { CustodianRelationship } from '@daml.js/da-marketplace/lib/Marketplace/Custodian'
import { MarketRole } from '@daml.js/da-marketplace/lib/Marketplace/Utils'

import { useDismissibleNotifications } from '../common/DismissibleNotifications'
import BrokerProfile, { Profile, createField } from '../common/Profile'
import { wrapDamlTuple, makeContractInfo } from '../common/damlTypes'
import { useRegistryLookup } from '../common/RegistryLookup'
import { useOperator } from '../common/common'
import MarketRelationships from '../common/MarketRelationships'
import InviteAcceptTile from '../common/InviteAcceptTile'
import OnboardingTile from '../common/OnboardingTile'
import LandingPage from '../common/LandingPage'
import Holdings from '../common/Holdings'

import BrokerOrders from './BrokerOrders'
import BrokerSideNav from './BrokerSideNav'
import FormErrorHandled from '../common/FormErrorHandled'


type Props = {
    onLogout: () => void;
}

const Broker: React.FC<Props> = ({ onLogout }) => {
    const { path, url } = useRouteMatch();
    const operator = useOperator();
    const broker = useParty();
    const ledger = useLedger();

    const registeredBroker = useStreamQueries(RegisteredBroker, () => [], [], (e) => {
        console.log("Unexpected close from registeredBroker: ", e);
    });
    const allCustodianRelationships = useStreamQueries(CustodianRelationship, () => [], [], (e) => {
        console.log("Unexpected close from custodianRelationship: ", e);
    }).contracts.map(makeContractInfo);
    const allDeposits = useStreamQueries(AssetDeposit, () => [], [], (e) => {
        console.log("Unexpected close from assetDepositBroker: ", e);
    }).contracts.map(makeContractInfo);
    const notifications = useDismissibleNotifications();

    const { custodianMap, exchangeMap } = useRegistryLookup();

    const exchangeProviders = useStreamQueries(ExchangeParticipant, () => [], [], (e) => {
        console.log("Unexpected close from exchangeParticipant: ", e);
    }).contracts
        .map(exchParticipant => {
            const party = exchParticipant.payload.exchange;
            const name = exchangeMap.get(party)?.name;
            return {
                party,
                label: `${name ? `${name} (${party})` : party} | Exchange`
            }
        });

    const allProviders = [
        ...exchangeProviders,
        ...allCustodianRelationships.map(relationship => {
            const party = relationship.contractData.custodian;
            const name = custodianMap.get(party)?.name;
            return {
                party,
                label: `${name ? `${name} (${party})` : party} | Custodian`,
            }
        }),
    ]

    const [ profile, setProfile ] = useState<Profile>({
        'name': createField('', 'Name', 'Your legal name', 'text'),
        'location': createField('', 'Location', 'Your current location', 'text')
    });

    useEffect(() => {
        if (registeredBroker.contracts[0]) {
            const rbData = registeredBroker.contracts[0].payload;
            setProfile({
                name: { ...profile.name, value: rbData.name },
                location: { ...profile.location, value: rbData.location }
            })
        }
    }, [registeredBroker]);

    const updateProfile = async () => {
        const key = wrapDamlTuple([operator, broker]);
        const args = {
            newName: profile.name.value,
            newLocation: profile.location.value,
        };
        await ledger.exerciseByKey(RegisteredBroker.RegisteredBroker_UpdateProfile, key, args)
                    .catch(err => console.error(err));
    }

    const acceptInvite = async () => {
        const key = wrapDamlTuple([operator, broker]);
        const args = {
            name: profile.name.value,
            location: profile.location.value
        };
        await ledger.exerciseByKey(BrokerInvitation.BrokerInvitation_Accept, key, args)
                    .catch(err => console.error(err));
    }

    const inviteScreen = (
        <InviteAcceptTile role={MarketRole.BrokerRole} onSubmit={acceptInvite} onLogout={onLogout}>
            <BrokerProfile
                content='Submit'
                defaultProfile={profile}
                submitProfile={profile => setProfile(profile)}/>
        </InviteAcceptTile>
    );

    const loadingScreen = <OnboardingTile>Loading...</OnboardingTile>

    const sideNav = <BrokerSideNav url={url}
                                   name={registeredBroker.contracts[0]?.payload.name || broker}/>

    const brokerScreen = <Switch>
        <Route exact path={path}>
            <LandingPage
                profile={
                    <FormErrorHandled onSubmit={updateProfile}>
                        <BrokerProfile
                            content='Save'
                            defaultProfile={profile}
                            submitProfile={profile => setProfile(profile)}/>
                    </FormErrorHandled>
                }
                marketRelationships={
                    <MarketRelationships role={MarketRole.BrokerRole}
                                         custodianRelationships={allCustodianRelationships}/>}
                sideNav={sideNav}
                notifications={notifications}
                onLogout={onLogout}/>
        </Route>

        <Route path={`${path}/wallet`}>
            <Holdings
                deposits={allDeposits}
                providers={allProviders}
                role={MarketRole.BrokerRole}
                sideNav={sideNav}
                onLogout={onLogout} />
        </Route>

        <Route path={`${path}/orders`}>
            <BrokerOrders
                sideNav={sideNav}
                deposits={allDeposits}
                onLogout={onLogout}/>
        </Route>
    </Switch>

    return registeredBroker.loading
        ? loadingScreen
        : registeredBroker.contracts.length === 0 ? inviteScreen : brokerScreen
}

export default Broker;
