<svelte:options accessors={true} />

<script lang="ts">
    import Controls from "./Controls.svelte";
    import Table from "./Table.svelte";
    import Create from "./Create.svelte";

    import store from "./store";
    import type TrackerView from "src/view";

    import { Creature } from "src/utils/creature";
    import { ExtraButtonComponent } from "obsidian";
    import { ADD, COPY } from "src/utils";
    import { ConditionSuggestionModal } from "src/utils/suggester";
    import type { Condition } from "@types";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let creatures: Creature[] = [];
    export let name: string = null;
    export let state: boolean;
    export let current: number;

    let view: TrackerView;
    store.view.subscribe((v) => (view = v));

    export let show: boolean;

    export let updatingHP: Creature = null;
    const updateHP = (toAdd: number) => {
        view.updateCreature(updatingHP, { hp: -1 * toAdd });
        updatingHP = null;
    };

    export let updatingStatus: Creature = null;
    const addStatus = (tag: Condition) => {
        view.addStatus(updatingStatus, tag);
        updatingStatus = null;
    };

    let addNew = false;
    export let addNewAsync = false;
    const addButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setTooltip("Add Creature")
            .setIcon(ADD)
            .onClick(() => {
                addNew = true;
            });
    };
    const copyButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setTooltip("Copy Initiative Order")
            .setIcon(COPY)
            .onClick(async () => {
                await view.copyInitiativeOrder();
            });
    };
    let modal: ConditionSuggestionModal;
    const suggestConditions = (node: HTMLInputElement) => {
        modal = new ConditionSuggestionModal(view.plugin, node);
        modal.onClose = () => {
            node.blur();
        };
        modal.open();
    };

    const renameCreatures = (creatures: Creature[]): Creature[] => {
      const creatureNameMap = creatures.reduce((soFar, creature) => {
        const seen = soFar[creature.name] || []
        soFar[creature.name] = [...seen, creature]
        return soFar
      }, {} as Record<string, Creature[]>)
      for (let [name, creaturesPerName] of Object.entries(creatureNameMap)) {
        if (creaturesPerName.length > 1) {
          for (let i = 0; i <= creaturesPerName.length - 1; i++) {
            creaturesPerName[i].name = name + "#" + (i+1)
          }
        }
      }
      return creatures
    }

    function init(el: HTMLInputElement) {
        el.focus();
    }
</script>

<div class="obsidian-initiative-tracker">
    <Controls {state} />
    {#if name && name.length}
        <div class="initiative-tracker-name-container">
            <h2 class="initiative-tracker-name">{name}</h2>
        </div>
    {/if}
    <Table
        creatures={renameCreatures(creatures)}
        {show}
        {state}
        {current}
        on:update-hp={(evt) => {
            updatingHP = evt.detail;
        }}
        on:update-tags={(evt) => {
            updatingStatus = evt.detail;
        }}
    />
    {#if updatingHP}
        <div class="updating-hp">
            <span>Apply damage(+) or healing(-):</span>
            <!-- svelte-ignore a11y-autofocus -->
            <input
                type="number"
                on:blur={function (_) {
                    updateHP(Number(this.value));
                }}
                on:keydown={function (evt) {
                    if (evt.key === "Enter" || evt.key === "Tab") {
                        evt.preventDefault();
                        this.blur();
                        return;
                    }
                    if (evt.key === "Escape") {
                        this.value = "";
                        this.blur();
                        return;
                    }
                    if (
                        !/^(-?\d*\.?\d*|Backspace|Delete|Arrow\w+)$/.test(
                            evt.key
                        )
                    ) {
                        evt.preventDefault();
                        return false;
                    }
                }}
                use:init
            />
        </div>
    {:else if updatingStatus}
        <div class="updating-hp">
            <span>Apply status:</span>
            <!-- svelte-ignore a11y-autofocus -->
            <input
                type="text"
                on:focus={function (_) {
                    suggestConditions(this);
                }}
                on:blur={function (_) {
                    if (!this.value.length) {
                        updatingStatus = null;
                        return;
                    }

                    addStatus(modal.condition);
                }}
                on:keydown={function (evt) {
                    if (evt.key === "Escape") {
                        this.value = "";
                        this.blur();
                        return;
                    }
                    if (evt.key === "Enter" || evt.key === "Tab") {
                        evt.preventDefault();
                        this.blur();
                        return;
                    }
                    if (evt.key === "Escape") {
                        this.value = "";
                        this.blur();
                        return;
                    }
                }}
                use:init
            />
        </div>
    {:else}
        <div class="add-creature-container">
            {#if addNew || addNewAsync}
                <Create
                    on:cancel={() => {
                        addNew = false;
                        addNewAsync = false;
                        dispatch("cancel-add-new-async");
                    }}
                    on:save={(evt) => {
                        const creature = evt.detail;
                        const newCreature = new Creature(
                            {
                                name: creature.name,
                                hp: creature.hp,
                                ac: creature.ac,
                                modifier: creature.modifier,
                                player: creature.player,
                            },
                            creature.initiative
                        );
                        if (addNewAsync) {
                            dispatch("add-new-async", newCreature);
                        } else {
                            view.addCreatures(newCreature);
                        }
                        addNew = false;
                        addNewAsync = false;
                    }}
                />
            {:else}
                <div class="context-container">
                    <div use:copyButton class="copy-button" />
                    <div use:addButton class="add-button" />
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .obsidian-initiative-tracker {
        margin: 0.5rem;
        min-width: 180px;
    }

    .add-creature-container {
        display: flex;
        flex-flow: column nowrap;
        justify-content: flex-start;
        margin-right: 0.5rem;
    }
    .context-container {
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
    }
    .copy-button {
        width: min-content;
        opacity: 0.25;
    }
    .copy-button:hover {
        opacity: 1;
    }
    .add-button {
        width: min-content;
    }
    .initiative-tracker-name-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 0.5rem;
    }
    .initiative-tracker-name {
        margin: 0;
    }
</style>
